export type Rol = 'admin' | 'cajero' | 'mesero' | 'cocina'

export interface Usuario {
  id: number
  username: string
  email: string
  nombre: string
  is_superuser: boolean
  rol: Rol
  permisos: string[]
}

/** Respuesta de /api/auth/login/ y /api/auth/refresh/ */
export interface SessionResponse {
  access: string
  user: Usuario
}
