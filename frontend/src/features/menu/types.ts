import type { Ingrediente } from '@/features/inventario/types'

export interface Categoria {
  id: number
  nombre: string
  descripcion: string
  activo: boolean
  total_productos?: number
}

export interface RecetaItem {
  id: number
  ingrediente: Ingrediente
  cantidad: string
}

export interface ProductoAdmin {
  id: number
  nombre: string
  categoria: Categoria | null
  descripcion: string
  precio: string
  imagen: string | null
  disponible: boolean
  receta: RecetaItem[]
}
