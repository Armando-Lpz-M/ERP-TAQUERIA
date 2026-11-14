import { Navigate, Outlet, useLocation } from 'react-router'

import { ForbiddenPage } from '@/pages/forbidden-page'
import { FullScreenLoader } from '@/components/full-screen-loader'

import { useAuth } from './auth-context'
import type { Rol } from './types'

/** Solo deja pasar a usuarios con sesión; si no, manda al login y recuerda a dónde iba. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullScreenLoader />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

/** Solo deja pasar a los roles indicados (el backend valida lo mismo en cada endpoint). */
export function RequireRole({ roles }: { roles: Rol[] }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.rol)) return <ForbiddenPage />
  return <Outlet />
}

/** El login solo se muestra si NO hay sesión. */
export function RedirectIfAuthenticated() {
  const { status } = useAuth()
  const location = useLocation()
  const destino = (location.state as { from?: Location } | null)?.from?.pathname ?? '/'

  if (status === 'loading') return <FullScreenLoader />
  if (status === 'authenticated') return <Navigate to={destino} replace />
  return <Outlet />
}
