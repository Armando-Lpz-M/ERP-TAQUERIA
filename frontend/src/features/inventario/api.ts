import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'

import type { Entrada, Ingrediente, Paginado, Proveedor, Salida, Unidad } from './types'

export const inventarioKeys = {
  ingredientes: ['inventario', 'ingredientes'] as const,
  proveedores: ['inventario', 'proveedores'] as const,
  entradas: ['inventario', 'entradas'] as const,
  salidas: ['inventario', 'salidas'] as const,
}

export function useIngredientes() {
  return useQuery({ queryKey: inventarioKeys.ingredientes, queryFn: () => api<Ingrediente[]>('/cocina/ingredientes/') })
}

export function useProveedores() {
  return useQuery({ queryKey: inventarioKeys.proveedores, queryFn: () => api<Proveedor[]>('/inventario/proveedores/') })
}

export function useEntradas(limit = 50) {
  return useQuery({
    queryKey: [...inventarioKeys.entradas, limit],
    queryFn: () => api<Paginado<Entrada>>(`/inventario/entradas/?limit=${limit}`),
  })
}

export function useSalidas(limit = 50) {
  return useQuery({
    queryKey: [...inventarioKeys.salidas, limit],
    queryFn: () => api<Paginado<Salida>>(`/inventario/salidas/?limit=${limit}`),
  })
}

function useRefrescarInventario() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['inventario'] })
    void qc.invalidateQueries({ queryKey: ['admin', 'productos'] }) // las recetas muestran ingredientes
  }
}

export interface IngredienteInput {
  nombre: string
  unidad: Unidad
  stock_minimo: string
  stock_actual?: string
}

export function useGuardarIngrediente() {
  const refrescar = useRefrescarInventario()
  return useMutation({
    mutationFn: ({ id, ...datos }: IngredienteInput & { id?: number }) =>
      id
        ? api<Ingrediente>(`/cocina/ingredientes/${id}/`, { method: 'PATCH', body: datos })
        : api<Ingrediente>('/cocina/ingredientes/', { method: 'POST', body: datos }),
    onSuccess: refrescar,
  })
}

export function useBorrarIngrediente() {
  const refrescar = useRefrescarInventario()
  return useMutation({
    mutationFn: (id: number) => api(`/cocina/ingredientes/${id}/`, { method: 'DELETE' }),
    onSuccess: refrescar,
  })
}

export function useRegistrarEntrada() {
  const refrescar = useRefrescarInventario()
  return useMutation({
    mutationFn: (datos: { ingrediente_id: number; cantidad: string; costo_unitario: string; proveedor_id?: number | null; notas?: string }) =>
      api<Entrada>('/inventario/entradas/', { method: 'POST', body: datos }),
    onSuccess: refrescar,
  })
}

export function useRegistrarSalida() {
  const refrescar = useRefrescarInventario()
  return useMutation({
    mutationFn: (datos: { ingrediente_id: number; cantidad: string; motivo: 'merma' | 'ajuste'; notas?: string }) =>
      api<Salida>('/inventario/salidas/', { method: 'POST', body: datos }),
    onSuccess: refrescar,
  })
}

export function useGuardarProveedor() {
  const refrescar = useRefrescarInventario()
  return useMutation({
    mutationFn: ({ id, ...datos }: Omit<Proveedor, 'id' | 'activo'> & { id?: number }) =>
      id
        ? api<Proveedor>(`/inventario/proveedores/${id}/`, { method: 'PATCH', body: datos })
        : api<Proveedor>('/inventario/proveedores/', { method: 'POST', body: datos }),
    onSuccess: refrescar,
  })
}

export function useBorrarProveedor() {
  const refrescar = useRefrescarInventario()
  return useMutation({
    mutationFn: (id: number) => api(`/inventario/proveedores/${id}/`, { method: 'DELETE' }),
    onSuccess: refrescar,
  })
}
