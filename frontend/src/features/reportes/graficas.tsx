import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis, type TooltipContentProps } from 'recharts'

import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { formatMoney, toNumber } from '@/lib/format'

import { fechaCorta } from './fechas'
import type { ResumenVentas } from './types'

const compacto = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 })
const ejeDinero = (v: number) => (v >= 10_000 ? compacto.format(v) : formatMoney(v).replace('.00', ''))

/** Tooltip: el valor manda, la etiqueta acompaña; la clave es una línea del color de la serie. */
function Globo({ active, payload, titulo }: Partial<TooltipContentProps<number, string>> & { titulo: (p: Record<string, unknown>) => string }) {
  if (!active || !payload?.length) return null
  const datos = payload[0].payload as Record<string, unknown>
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{titulo(datos)}</p>
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: String(payload[0].color ?? 'var(--chart-1)') }} />
        {formatMoney(toNumber(datos.total as string))}
      </p>
      <p className="text-muted-foreground">
        {String(datos.ordenes)} {datos.ordenes === 1 ? 'orden' : 'órdenes'}
      </p>
    </div>
  )
}

const configVentas = { total: { label: 'Ventas', color: 'var(--chart-1)' } } satisfies ChartConfig

export function VentasPorDia({ datos }: { datos: ResumenVentas['por_dia'] }) {
  const filas = datos.map((d) => ({ ...d, valor: toNumber(d.total) }))
  const muchos = filas.length > 14
  return (
    <ChartContainer config={configVentas} className="aspect-auto h-64 w-full">
      <BarChart data={filas} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="fecha"
          tickLine={false}
          axisLine={{ stroke: 'var(--input)' }}
          tickMargin={8}
          minTickGap={muchos ? 16 : 4}
          tickFormatter={(f: string) => fechaCorta(f)}
        />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={ejeDinero} allowDecimals={false} />
        <ChartTooltip cursor={{ fill: 'var(--secondary)' }} content={<Globo titulo={(d) => fechaCorta(String(d.fecha), true)} />} />
        <Bar dataKey="valor" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  )
}

export function VentasPorHora({ datos }: { datos: ResumenVentas['por_hora'] }) {
  const conVentas = datos.filter((h) => h.ordenes > 0)
  if (conVentas.length === 0) return <SinDatos />
  // Solo el horario con actividad (una hora de margen a cada lado)
  const primera = Math.max(0, conVentas[0].hora - 1)
  const ultima = Math.min(23, conVentas[conVentas.length - 1].hora + 1)
  const filas = datos.filter((h) => h.hora >= primera && h.hora <= ultima).map((h) => ({ ...h, valor: toNumber(h.total) }))
  const pico = filas.reduce((max, h) => (h.valor > max.valor ? h : max), filas[0])

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Hora pico: <span className="font-medium text-foreground">{etiquetaHora(pico.hora)}</span> · {formatMoney(pico.valor)}
      </p>
      <ChartContainer config={configVentas} className="aspect-auto h-56 w-full">
        <BarChart data={filas} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="hora" tickLine={false} axisLine={{ stroke: 'var(--input)' }} tickMargin={8} minTickGap={8} tickFormatter={(h: number) => `${h} h`} />
          <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={ejeDinero} allowDecimals={false} />
          <ChartTooltip cursor={{ fill: 'var(--secondary)' }} content={<Globo titulo={(d) => etiquetaHora(Number(d.hora))} />} />
          <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {filas.map((h) => (
              <Cell key={h.hora} fill={h.hora === pico.hora ? 'var(--chart-1)' : 'var(--chart-5)'} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

function SinDatos() {
  return <p className="py-8 text-center text-sm text-muted-foreground">Sin ventas en este periodo.</p>
}

const etiquetaHora = (h: number) => `${String(h).padStart(2, '0')}:00 – ${String(h).padStart(2, '0')}:59`
