import type { ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'

import { RedirectIfAuthenticated, RequireAuth, RequireRole } from '@/features/auth/guards'
import { AppLayout } from '@/layouts/app-layout'
import { NAV_ITEMS } from '@/lib/navigation'
import { ComingSoonPage } from '@/pages/coming-soon-page'
import { DashboardPage } from '@/pages/dashboard-page'
import {
  LazyCocinaPage,
  LazyEmpleadosPage,
  LazyInventarioPage,
  LazyMenuPage,
  LazyOrdenDetallePage,
  LazyOrdenesPage,
} from '@/pages/lazy-pages'
import { LoginPage } from '@/pages/login-page'
import { NotFoundPage } from '@/pages/not-found-page'

/** Pantallas ya migradas. Las demás muestran "Próximamente" hasta su paso. */
const PAGINAS: Record<string, ReactNode> = {
  '/': <DashboardPage />,
  '/ordenes': <LazyOrdenesPage />,
  '/cocina': <LazyCocinaPage />,
  '/menu': <LazyMenuPage />,
  '/inventario': <LazyInventarioPage />,
  '/empleados': <LazyEmpleadosPage />,
}

/** Rutas extra dentro de un módulo (mismos roles que el módulo) */
const SUBRUTAS: Record<string, RouteObject[]> = {
  '/ordenes': [{ path: 'ordenes/:id', element: <LazyOrdenDetallePage /> }],
}

// Cada módulo queda protegido con los mismos roles que muestra el sidebar
const rutasModulos: RouteObject[] = NAV_ITEMS.map((item) => ({
  element: <RequireRole roles={item.roles} />,
  children: [
    item.path === '/'
      ? { index: true, element: PAGINAS[item.path] }
      : { path: item.path.slice(1), element: PAGINAS[item.path] ?? <ComingSoonPage item={item} /> },
    ...(SUBRUTAS[item.path] ?? []),
  ],
}))

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [...rutasModulos, { path: '*', element: <NotFoundPage /> }],
      },
    ],
  },
])
