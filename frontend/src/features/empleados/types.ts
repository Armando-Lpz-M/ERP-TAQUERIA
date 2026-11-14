export type RolEmpleado = 'taquero' | 'mesero' | 'cajero' | 'admin'

export const ROLES_EMPLEADO: { value: RolEmpleado; label: string; descripcion: string }[] = [
  { value: 'mesero', label: 'Mesero', descripcion: 'Toma órdenes' },
  { value: 'cajero', label: 'Cajero', descripcion: 'Toma órdenes, cobra y ve reportes del día' },
  { value: 'taquero', label: 'Taquero', descripcion: 'Ve y prepara los pedidos de cocina' },
  { value: 'admin', label: 'Administrador', descripcion: 'Acceso total' },
]

export const ROL_EMPLEADO_LABEL = Object.fromEntries(ROLES_EMPLEADO.map((r) => [r.value, r.label])) as Record<RolEmpleado, string>

export interface Empleado {
  id: number
  usuario_username: string | null
  tiene_acceso: boolean
  turno_activo: string | null
  nombre: string
  apellido: string
  rol: RolEmpleado
  telefono: string
  activo: boolean
  fecha_ingreso: string
}

export interface Turno {
  id: number
  empleado: Empleado
  entrada: string
  salida: string | null
  horas_trabajadas: number | null
  notas: string
}

/** 7.5 → "7 h 30 min" */
export function formatHoras(horas: number) {
  const totalMin = Math.round(horas * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}
