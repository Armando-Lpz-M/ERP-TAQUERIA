import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { api, refreshSession, setAccessToken, setSessionExpiredHandler } from '@/lib/api'

import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'
import type { SessionResponse, Usuario } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<Usuario | null>(null)

  const terminarSesion = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  // Al abrir o recargar la página, intenta restaurar la sesión con la cookie httpOnly
  useEffect(() => {
    let activo = true
    refreshSession().then((session) => {
      if (!activo) return
      if (session) {
        setUser(session.user)
        setStatus('authenticated')
      } else {
        setStatus('anonymous')
      }
    })
    return () => {
      activo = false
    }
  }, [])

  // Si la API avisa que la sesión expiró, regresa al login
  useEffect(() => {
    setSessionExpiredHandler(() => {
      terminarSesion()
      toast.warning('Tu sesión expiró. Vuelve a iniciar sesión.')
    })
    return () => setSessionExpiredHandler(null)
  }, [terminarSesion])

  const login = useCallback(async (username: string, password: string) => {
    const session = await api<SessionResponse>('/auth/login/', {
      method: 'POST',
      body: { username, password },
    })
    setAccessToken(session.access)
    setUser(session.user)
    setStatus('authenticated')
    return session.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout/', { method: 'POST' })
    } finally {
      terminarSesion()
    }
  }, [terminarSesion])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
