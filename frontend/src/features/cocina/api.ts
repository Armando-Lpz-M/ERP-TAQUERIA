import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'

export type EstadoCocina = 'abierta' | 'en_proceso' | 'lista'

export interface OrdenCocina {
  id: number
  referencia: string
  estado: EstadoCocina
  items: { producto: string; cantidad: number; notas: string }[]
  creada: string
  actualizada: string
}

const KEY = ['cocina', 'pendientes'] as const

export function usePendientesCocina() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<OrdenCocina[]>('/ventas/ordenes/pendientes-cocina/'),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  })
}

export function useAvanzarPedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoCocina }) =>
      api<OrdenCocina>(`/ventas/ordenes/${id}/cambiar-estado/`, { method: 'POST', body: { estado } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY })
      void qc.invalidateQueries({ queryKey: ['ordenes'] })
    },
  })
}
