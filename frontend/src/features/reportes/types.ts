import type { MetodoPago } from '@/features/ordenes/types'

export interface ResumenVentas {
  desde: string
  hasta: string
  total_ventas: string
  total_ordenes: number
  ticket_promedio: string
  ordenes_canceladas: number
  por_metodo: Record<MetodoPago, string>
  por_dia: { fecha: string; total: string; ordenes: number }[]
  por_hora: { hora: number; total: string; ordenes: number }[]
  top_productos: { producto: string; cantidad: number; total: string }[]
}

export interface Rango {
  desde: string
  hasta: string
}
