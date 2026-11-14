import {
  ChartColumn,
  ChefHat,
  LayoutDashboard,
  Package,
  ReceiptText,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

import type { Rol } from '@/features/auth/types'

export const ROL_LABEL: Record<Rol, string> = {
  admin: 'Administrador',
  cajero: 'Cajero',
  mesero: 'Mesero',
  cocina: 'Cocina',
}

const TODOS: Rol[] = ['admin', 'cajero', 'mesero', 'cocina']

export interface NavItem {
  path: string
  title: string
  description: string
  icon: LucideIcon
  roles: Rol[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/**
 * Única fuente de verdad del menú y de las rutas.
 * Los roles coinciden con los permisos que valida el backend.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [
      {
        path: '/',
        title: 'Dashboard',
        description: 'Resumen del día: ventas, órdenes abiertas y alertas',
        icon: LayoutDashboard,
        roles: TODOS,
      },
      {
        path: '/ordenes',
        title: 'Tomar orden',
        description: 'Crear órdenes por mesa o cliente, agregar productos y cobrar',
        icon: ReceiptText,
        roles: ['admin', 'cajero', 'mesero'],
      },
      {
        path: '/cocina',
        title: 'Cocina',
        description: 'Pedidos pendientes y en preparación',
        icon: ChefHat,
        roles: ['admin', 'cocina'],
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      {
        path: '/menu',
        title: 'Menú',
        description: 'Categorías, productos, precios y recetas',
        icon: UtensilsCrossed,
        roles: ['admin'],
      },
      {
        path: '/inventario',
        title: 'Inventario',
        description: 'Entradas, salidas, mermas y stock bajo',
        icon: Package,
        roles: ['admin'],
      },
      {
        path: '/empleados',
        title: 'Empleados',
        description: 'Personal, roles y turnos',
        icon: Users,
        roles: ['admin'],
      },
    ],
  },
  {
    label: 'Análisis',
    items: [
      {
        path: '/reportes',
        title: 'Reportes',
        description: 'Ventas, gráficas y exportación a Excel y PDF',
        icon: ChartColumn,
        roles: ['admin', 'cajero'],
      },
    ],
  },
]

export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)

export function puedeVer(item: Pick<NavItem, 'roles'>, rol: Rol | undefined) {
  return !!rol && item.roles.includes(rol)
}

export function seccionesParaRol(rol: Rol | undefined): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => puedeVer(item, rol)),
  })).filter((section) => section.items.length > 0)
}
