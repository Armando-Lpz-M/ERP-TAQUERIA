import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { ApiError } from '@/lib/api'

/** Número decimal escrito como texto ("12", "12.5", "12.50") */
export const decimal = (mensaje = 'Escribe una cantidad válida', decimales = 2) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^\\d+(\\.\\d{1,${decimales}})?$`), mensaje)

export const decimalPositivo = (mensaje?: string, decimales = 2) =>
  decimal(mensaje, decimales).refine((v) => Number(v) > 0, 'Debe ser mayor a 0')

/**
 * Pone los errores de validación de Django junto a cada campo del formulario;
 * lo que no corresponde a un campo se muestra como aviso.
 */
export function aplicarErroresServidor<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  campos: readonly string[],
  alias: Record<string, string> = {},
) {
  if (error instanceof ApiError && error.status === 400 && error.data && typeof error.data === 'object') {
    let asignado = false
    for (const [campo, valor] of Object.entries(error.data as Record<string, unknown>)) {
      const destino = alias[campo] ?? campo
      const mensaje = Array.isArray(valor) ? String(valor[0]) : String(valor)
      if (campos.includes(destino)) {
        setError(destino as Path<T>, { message: mensaje })
        asignado = true
      } else {
        toast.error(mensaje)
        asignado = true
      }
    }
    if (asignado) return
  }
  toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
}
