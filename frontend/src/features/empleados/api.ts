import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'

import type { Empleado, RolEmpleado, Turno } from './types'

export const empleadosKeys = {
  lista: ['empleados', 'lista'] as const,
  turnos: (filtros: TurnosFiltro) => ['empleados', 'turnos', filtros] as const,
}

export function useEmpleados() {
  return useQuery({ queryKey: empleadosKeys.lista, queryFn: () => api<Empleado[]>('/empleados/empleados/') })
}

export interface TurnosFiltro {
  desde: string
  hasta: string
  empleado?: number
}

export function useTurnos(filtro: TurnosFiltro) {
  const params = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta })
  if (filtro.empleado) params.set('empleado', String(filtro.empleado))
  return useQuery({
    queryKey: empleadosKeys.turnos(filtro),
    queryFn: () => api<Turno[]>(`/empleados/turnos/?${params}`),
  })
}

function useRefrescar() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: ['empleados'] })
}

export interface EmpleadoInput {
  nombre: string
  apellido: string
  rol: RolEmpleado
  telefono: string
  username?: string
  password?: string
}

export function useGuardarEmpleado() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: ({ id, ...datos }: Partial<EmpleadoInput> & { id?: number; activo?: boolean }) =>
      id
        ? api<Empleado>(`/empleados/empleados/${id}/`, { method: 'PATCH', body: datos })
        : api<Empleado>('/empleados/empleados/', { method: 'POST', body: datos }),
    onSuccess: refrescar,
  })
}

export function useDarDeBaja() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: (id: number) => api(`/empleados/empleados/${id}/`, { method: 'DELETE' }),
    onSuccess: refrescar,
  })
}

export function useAcceso() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: ({ id, ...datos }: { id: number; username?: string; password: string }) =>
      api<Empleado>(`/empleados/empleados/${id}/acceso/`, { method: 'POST', body: datos }),
    onSuccess: refrescar,
  })
}

export function useTurnoReloj() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: ({ id, accion }: { id: number; accion: 'entrada' | 'salida' }) =>
      api<Turno>(`/empleados/empleados/${id}/${accion}/`, { method: 'POST' }),
    onSuccess: refrescar,
  })
}
