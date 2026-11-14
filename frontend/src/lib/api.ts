/**
 * Cliente de la API de Django.
 *
 * - El access token vive SOLO en memoria (nunca en localStorage).
 * - El refresh token está en una cookie httpOnly que maneja el navegador.
 * - Si una petición responde 401, se renueva el access token una vez y se reintenta.
 */
import type { SessionResponse } from '@/features/auth/types'

const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

let accessToken: string | null = null
let refreshInFlight: Promise<SessionResponse | null> | null = null
let onSessionExpired: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

/** El AuthProvider se registra aquí para enterarse si la sesión expiró. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(status: number, data: unknown) {
    super(extraerMensaje(data) ?? `Error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/** Saca un mensaje legible de las respuestas de error de DRF. */
function extraerMensaje(data: unknown): string | null {
  if (!data || typeof data !== 'object') return typeof data === 'string' && data ? data : null
  const record = data as Record<string, unknown>
  if (typeof record.detail === 'string') return record.detail
  for (const value of Object.values(record)) {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  }
  return null
}

async function leerCuerpo(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Pide un access token nuevo usando la cookie httpOnly.
 * Si varias peticiones lo piden a la vez, comparten la misma llamada.
 */
export function refreshSession(): Promise<SessionResponse | null> {
  refreshInFlight ??= fetch(`${API_URL}/auth/refresh/`, {
    method: 'POST',
    credentials: 'same-origin',
  })
    .then(async (res) => {
      if (!res.ok) return null
      const session = (await res.json()) as SessionResponse
      setAccessToken(session.access)
      return session
    })
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export async function api<T = unknown>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { body, headers, ...rest } = options
  const isFormData = body instanceof FormData

  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'same-origin',
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })

  if (res.status === 401 && retry && accessToken) {
    const session = await refreshSession()
    if (session) return api<T>(path, options, false)
    setAccessToken(null)
    onSessionExpired?.()
  }

  const data = await leerCuerpo(res)
  if (!res.ok) throw new ApiError(res.status, data)
  return data as T
}
