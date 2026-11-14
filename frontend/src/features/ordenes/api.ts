import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'

import type { CategoriaMenu, Mesa, MetodoPago, Orden, Ticket } from './types'

export const ordenesKeys = {
  activas: ['ordenes', 'activas'] as const,
  detalle: (id: number) => ['ordenes', id] as const,
  menu: ['menu'] as const,
  mesas: ['mesas'] as const,
}

export function useMenu() {
  return useQuery({
    queryKey: ordenesKeys.menu,
    queryFn: () => api<CategoriaMenu[]>('/cocina/productos/menu/'),
    staleTime: 5 * 60_000,
  })
}

export function useMesas() {
  return useQuery({
    queryKey: ordenesKeys.mesas,
    queryFn: () => api<Mesa[]>('/ventas/mesas/'),
    staleTime: 5 * 60_000,
  })
}

export function useOrdenesActivas() {
  return useQuery({
    queryKey: ordenesKeys.activas,
    queryFn: () => api<Orden[]>('/ventas/ordenes/activas/'),
    refetchInterval: 15_000, // ver cambios de cocina y de otros meseros
  })
}

export function useOrden(id: number) {
  return useQuery({
    queryKey: ordenesKeys.detalle(id),
    queryFn: () => api<Orden>(`/ventas/ordenes/${id}/`),
    refetchInterval: 20_000,
  })
}

/** Guarda la orden que devuelve el servidor y refresca la lista de activas. */
function useGuardarOrden() {
  const qc = useQueryClient()
  return (orden: Orden) => {
    qc.setQueryData(ordenesKeys.detalle(orden.id), orden)
    void qc.invalidateQueries({ queryKey: ordenesKeys.activas })
  }
}

export interface NuevaOrden {
  mesa?: number | null
  cliente?: string
}

export function useCrearOrden() {
  const guardar = useGuardarOrden()
  return useMutation({
    mutationFn: (datos: NuevaOrden) => api<Orden>('/ventas/ordenes/', { method: 'POST', body: datos }),
    onSuccess: guardar,
  })
}

export function useAgregarItem(ordenId: number) {
  const guardar = useGuardarOrden()
  return useMutation({
    mutationFn: (datos: { producto_id: number; cantidad?: number; notas?: string }) =>
      api<Orden>(`/ventas/ordenes/${ordenId}/items/`, { method: 'POST', body: datos }),
    onSuccess: guardar,
  })
}

export function useModificarItem(ordenId: number) {
  const guardar = useGuardarOrden()
  return useMutation({
    mutationFn: ({ itemId, ...datos }: { itemId: number; cantidad?: number; notas?: string }) =>
      api<Orden>(`/ventas/ordenes/${ordenId}/items/${itemId}/`, { method: 'PATCH', body: datos }),
    onSuccess: guardar,
  })
}

export function useQuitarItem(ordenId: number) {
  const guardar = useGuardarOrden()
  return useMutation({
    mutationFn: (itemId: number) => api<Orden>(`/ventas/ordenes/${ordenId}/items/${itemId}/`, { method: 'DELETE' }),
    onSuccess: guardar,
  })
}

export function useCancelarOrden(ordenId: number) {
  const guardar = useGuardarOrden()
  return useMutation({
    mutationFn: () => api<Orden>(`/ventas/ordenes/${ordenId}/cancelar/`, { method: 'POST' }),
    onSuccess: guardar,
  })
}

export function useCobrarOrden(ordenId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: { metodo_pago: MetodoPago; pagado_con?: string }) =>
      api<Ticket>(`/ventas/ordenes/${ordenId}/cerrar/`, { method: 'POST', body: datos }),
    onSuccess: (ticket) => {
      qc.setQueryData(ordenesKeys.detalle(ordenId), ticket.orden)
      void qc.invalidateQueries({ queryKey: ordenesKeys.activas })
    },
  })
}
