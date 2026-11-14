import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'

import type { Categoria, ProductoAdmin } from './types'

export const menuKeys = {
  productos: ['admin', 'productos'] as const,
  categorias: ['admin', 'categorias'] as const,
}

export function useProductosAdmin() {
  return useQuery({ queryKey: menuKeys.productos, queryFn: () => api<ProductoAdmin[]>('/cocina/productos/') })
}

export function useCategorias() {
  return useQuery({ queryKey: menuKeys.categorias, queryFn: () => api<Categoria[]>('/cocina/categorias/') })
}

/** Tras cambiar el menú, refresca también el menú de "Tomar orden" */
function useRefrescarMenu() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin'] })
    void qc.invalidateQueries({ queryKey: ['menu'] })
  }
}

export interface ProductoInput {
  nombre: string
  categoria_id: number
  precio: string
  descripcion?: string
  disponible?: boolean
}

export function useGuardarProducto() {
  const refrescar = useRefrescarMenu()
  return useMutation({
    mutationFn: ({ id, ...datos }: Partial<ProductoInput> & { id?: number }) =>
      id
        ? api<ProductoAdmin>(`/cocina/productos/${id}/`, { method: 'PATCH', body: datos })
        : api<ProductoAdmin>('/cocina/productos/', { method: 'POST', body: datos }),
    onSuccess: refrescar,
  })
}

export function useBorrarProducto() {
  const refrescar = useRefrescarMenu()
  return useMutation({
    mutationFn: (id: number) => api(`/cocina/productos/${id}/`, { method: 'DELETE' }),
    onSuccess: refrescar,
  })
}

export function useGuardarReceta() {
  const refrescar = useRefrescarMenu()
  return useMutation({
    mutationFn: ({ id, ingredientes }: { id: number; ingredientes: { ingrediente_id: number; cantidad: string }[] }) =>
      api<ProductoAdmin>(`/cocina/productos/${id}/receta/`, { method: 'PUT', body: { ingredientes } }),
    onSuccess: refrescar,
  })
}

export function useGuardarCategoria() {
  const refrescar = useRefrescarMenu()
  return useMutation({
    mutationFn: ({ id, ...datos }: { id?: number; nombre: string; descripcion?: string }) =>
      id
        ? api<Categoria>(`/cocina/categorias/${id}/`, { method: 'PATCH', body: datos })
        : api<Categoria>('/cocina/categorias/', { method: 'POST', body: datos }),
    onSuccess: refrescar,
  })
}

export function useBorrarCategoria() {
  const refrescar = useRefrescarMenu()
  return useMutation({
    mutationFn: (id: number) => api(`/cocina/categorias/${id}/`, { method: 'DELETE' }),
    onSuccess: refrescar,
  })
}
