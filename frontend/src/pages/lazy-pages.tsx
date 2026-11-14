import { lazy, Suspense } from 'react'

import { FullScreenLoader } from '@/components/full-screen-loader'

// Cada módulo se descarga solo cuando se visita
const Ordenes = lazy(() => import('./ordenes-page').then((m) => ({ default: m.OrdenesPage })))
const OrdenDetalle = lazy(() => import('./orden-detalle-page').then((m) => ({ default: m.OrdenDetallePage })))
const Cocina = lazy(() => import('./cocina-page').then((m) => ({ default: m.CocinaPage })))
const Menu = lazy(() => import('./menu-page').then((m) => ({ default: m.MenuPage })))
const Inventario = lazy(() => import('./inventario-page').then((m) => ({ default: m.InventarioPage })))

export const LazyOrdenesPage = () => (
  <Suspense fallback={<FullScreenLoader />}>
    <Ordenes />
  </Suspense>
)

export const LazyOrdenDetallePage = () => (
  <Suspense fallback={<FullScreenLoader />}>
    <OrdenDetalle />
  </Suspense>
)

export const LazyCocinaPage = () => (
  <Suspense fallback={<FullScreenLoader />}>
    <Cocina />
  </Suspense>
)

export const LazyMenuPage = () => (
  <Suspense fallback={<FullScreenLoader />}>
    <Menu />
  </Suspense>
)

export const LazyInventarioPage = () => (
  <Suspense fallback={<FullScreenLoader />}>
    <Inventario />
  </Suspense>
)
