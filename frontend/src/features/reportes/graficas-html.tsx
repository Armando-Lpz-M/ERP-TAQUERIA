import { METODO_LABEL, type MetodoPago } from '@/features/ordenes/types'
import { formatMoney, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { ResumenVentas } from './types'

/* Gráficas hechas con HTML (sin Recharts): ligeras, se usan también en el Dashboard */

const COLOR_METODO: Record<MetodoPago, string> = {
  efectivo: 'var(--chart-2)',
  tarjeta: 'var(--chart-3)',
  transferencia: 'var(--chart-4)',
}

/** Un total dividido en 3 partes: barra segmentada con leyenda (no dona). */
export function MetodosPago({ datos }: { datos: ResumenVentas['por_metodo'] }) {
  const partes = (Object.keys(COLOR_METODO) as MetodoPago[]).map((m) => ({ metodo: m, valor: toNumber(datos[m]) }))
  const total = partes.reduce((s, p) => s + p.valor, 0)
  if (total === 0) return <SinDatos />
  const visibles = partes.filter((p) => p.valor > 0)

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex h-7 w-full gap-0.5"
        role="img"
        aria-label={visibles.map((p) => `${METODO_LABEL[p.metodo]} ${Math.round((p.valor / total) * 100)}%`).join(', ')}
      >
        {visibles.map((p) => {
          const pct = (p.valor / total) * 100
          return (
            <div
              key={p.metodo}
              title={`${METODO_LABEL[p.metodo]}: ${formatMoney(p.valor)} (${Math.round(pct)}%)`}
              className="flex min-w-0 items-center rounded px-2 text-xs font-semibold text-white"
              style={{ width: `${pct}%`, background: COLOR_METODO[p.metodo] }}
            >
              {/* El porcentaje solo se imprime si cabe; si no, queda en la leyenda */}
              {pct >= 12 && `${Math.round(pct)}%`}
            </div>
          )
        })}
      </div>
      <ul className="grid gap-2 text-sm">
        {partes.map((p) => (
          <li key={p.metodo} className="flex items-center gap-2">
            <span aria-hidden className="size-3 shrink-0 rounded-sm" style={{ background: COLOR_METODO[p.metodo] }} />
            <span className="text-muted-foreground">{METODO_LABEL[p.metodo]}</span>
            <span className="ml-auto font-medium tabular-nums">{formatMoney(p.valor)}</span>
            <span className="w-11 text-right text-muted-foreground tabular-nums">{Math.round((p.valor / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Barras horizontales ordenadas, un solo color, con el valor en la punta. */
export function TopProductos({ datos, limite = 8 }: { datos: ResumenVentas['top_productos']; limite?: number }) {
  const filas = datos.slice(0, limite)
  if (filas.length === 0) return <SinDatos />
  const max = Math.max(...filas.map((f) => f.cantidad))
  return (
    <ol className="flex flex-col gap-3" aria-label="Productos más vendidos">
      {filas.map((f, i) => (
        <li key={f.producto} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
          <span className={cn('truncate text-sm', i === 0 && 'font-medium')} title={f.producto}>
            {f.producto}
          </span>
          <div className="col-span-2 row-start-2 h-3 sm:col-span-1 sm:row-start-auto" title={`${f.cantidad} piezas · ${formatMoney(f.total)}`}>
            <div className="h-full rounded-r bg-chart-1" style={{ width: `${Math.max((f.cantidad / max) * 100, 2)}%` }} />
          </div>
          <span className="col-start-2 row-start-1 text-right text-sm tabular-nums sm:col-start-auto sm:row-start-auto">
            {f.cantidad} <span className="text-muted-foreground">pzas</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function SinDatos() {
  return <p className="py-8 text-center text-sm text-muted-foreground">Sin ventas en este periodo.</p>
}
