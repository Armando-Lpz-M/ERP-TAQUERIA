export type Unidad = 'kg' | 'g' | 'l' | 'ml' | 'pza' | 'tortilla'

export const UNIDADES: { value: Unidad; label: string }[] = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'pza', label: 'Piezas (pza)' },
  { value: 'tortilla', label: 'Tortillas' },
]

export interface Ingrediente {
  id: number
  nombre: string
  unidad: Unidad
  stock_actual: string
  stock_minimo: string
  stock_bajo: boolean
  activo: boolean
}

export interface Proveedor {
  id: number
  nombre: string
  contacto: string
  telefono: string
  email: string
  activo: boolean
}

export interface Entrada {
  id: number
  ingrediente: Ingrediente
  proveedor: Proveedor | null
  cantidad: string
  costo_unitario: string
  costo_total: string
  fecha: string
  notas: string
}

export type MotivoSalida = 'venta' | 'merma' | 'ajuste'

export interface Salida {
  id: number
  ingrediente: Ingrediente
  cantidad: string
  motivo: MotivoSalida
  fecha: string
  notas: string
}

export interface Paginado<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const MOTIVO_LABEL: Record<MotivoSalida, string> = {
  venta: 'Venta',
  merma: 'Merma',
  ajuste: 'Ajuste',
}

/** "ok" | "atencion" (cerca del mínimo) | "bajo" */
export function nivelStock(i: Pick<Ingrediente, 'stock_actual' | 'stock_minimo'>) {
  const actual = Number(i.stock_actual)
  const minimo = Number(i.stock_minimo)
  if (actual <= minimo) return 'bajo' as const
  if (actual <= minimo * 1.5) return 'atencion' as const
  return 'ok' as const
}
