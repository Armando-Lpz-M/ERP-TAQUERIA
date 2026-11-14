export type EstadoOrden = 'abierta' | 'en_proceso' | 'lista' | 'pagada' | 'cancelada'
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia'

export interface ItemOrden {
  id: number
  producto: { id: number } | null
  producto_nombre: string
  cantidad: number
  precio_unitario: string
  subtotal: string
  notas: string
}

export interface Orden {
  id: number
  mesa: number | null
  mesa_numero: number | null
  cliente: string
  referencia: string
  empleado: number | null
  empleado_nombre: string | null
  estado: EstadoOrden
  items: ItemOrden[]
  total: string
  creada: string
  actualizada: string
  notas: string
}

export interface Ticket {
  id: number
  orden: Orden
  total: string
  metodo_pago: MetodoPago
  pagado_con: string | null
  cambio: string | null
  fecha: string
}

export interface ProductoMenu {
  id: number
  nombre: string
  precio: string
  disponible: boolean
}

export interface CategoriaMenu {
  categoria: string
  productos: ProductoMenu[]
}

export interface Mesa {
  id: number
  numero: number
  capacidad: number
  activa: boolean
}

export const ESTADO_LABEL: Record<EstadoOrden, string> = {
  abierta: 'Abierta',
  en_proceso: 'En cocina',
  lista: 'Lista',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
}

export const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}
