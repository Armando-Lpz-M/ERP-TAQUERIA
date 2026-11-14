import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api, descargar } from '@/lib/api'

import type { Rango, ResumenVentas } from './types'

export function useResumen(rango: Rango, enabled = true) {
  return useQuery({
    queryKey: ['reportes', 'resumen', rango],
    queryFn: () => api<ResumenVentas>(`/reportes/resumen/?${new URLSearchParams({ ...rango })}`),
    // Al cambiar de rango se queda la gráfica anterior mientras carga (sin saltos)
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    enabled,
  })
}

export function exportar(formato: 'excel' | 'pdf', rango: Rango) {
  return descargar(
    `/reportes/resumen/${formato}/?${new URLSearchParams({ ...rango })}`,
    `ventas.${formato === 'excel' ? 'xlsx' : 'pdf'}`,
  )
}
