import { FileSpreadsheet, FileText, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ResponsiveTable } from '@/components/responsive-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAuth } from '@/features/auth/auth-context'
import { exportar, useResumen } from '@/features/reportes/api'
import { fechaCorta, rangoPreset, type Preset } from '@/features/reportes/fechas'
import { VentasPorDia, VentasPorHora } from '@/features/reportes/graficas'
import { MetodosPago, TopProductos } from '@/features/reportes/graficas-html'
import type { Rango, ResumenVentas } from '@/features/reportes/types'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'mes', label: 'Este mes' },
]

function Indicadores({ r }: { r: ResumenVentas }) {
  const tiles = [
    { label: 'Ventas', valor: formatMoney(r.total_ventas), destacado: true },
    { label: 'Órdenes cobradas', valor: String(r.total_ordenes) },
    { label: 'Ticket promedio', valor: formatMoney(r.ticket_promedio) },
    { label: 'Órdenes canceladas', valor: String(r.ordenes_canceladas) },
  ]
  return (
    <section className="grid grid-cols-3 gap-3 lg:grid-cols-4" aria-label="Indicadores">
      {tiles.map((t) => (
        <Card key={t.label} className={cn('gap-1 py-4', t.destacado && 'col-span-3 lg:col-span-1')}>
          <CardHeader className="px-3 sm:px-4">
            <CardDescription className="text-xs sm:text-sm">{t.label}</CardDescription>
            <CardTitle className={cn('text-xl font-semibold sm:text-3xl', t.destacado && 'text-4xl text-primary sm:text-4xl')}>{t.valor}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </section>
  )
}

function Seccion({ titulo, descripcion, children, className }: { titulo: string; descripcion?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        {descripcion && <CardDescription>{descripcion}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function ReportesPage() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'
  const [preset, setPreset] = useState<Preset | 'custom'>('7d')
  const [rango, setRango] = useState<Rango>(() => rangoPreset(esAdmin ? '7d' : 'hoy'))
  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null)
  const { data: r, isPending, isError, isFetching, isPlaceholderData, refetch } = useResumen(rango)

  const unDia = rango.desde === rango.hasta

  async function onExportar(formato: 'excel' | 'pdf') {
    setExportando(formato)
    try {
      await exportar(formato, rango)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo exportar')
    } finally {
      setExportando(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Filtros: una fila arriba, afectan todo lo de abajo */}
      <div className="flex flex-col gap-3 @3xl/main:flex-row @3xl/main:items-end">
        {esAdmin ? (
          <>
            <ToggleGroup
              type="single"
              variant="outline"
              value={preset}
              onValueChange={(v) => {
                if (!v) return
                setPreset(v as Preset | 'custom')
                if (v !== 'custom') setRango(rangoPreset(v as Preset))
              }}
              aria-label="Periodo"
              className="grid grid-cols-5"
            >
              {PRESETS.map((p) => (
                <ToggleGroupItem key={p.value} value={p.value}>
                  {p.label}
                </ToggleGroupItem>
              ))}
              <ToggleGroupItem value="custom">Otro</ToggleGroupItem>
            </ToggleGroup>
            {preset === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="desde" className="text-xs text-muted-foreground">
                    Desde
                  </Label>
                  <Input
                    id="desde"
                    type="date"
                    value={rango.desde}
                    max={rango.hasta}
                    onChange={(e) => e.target.value && setRango((r) => ({ ...r, desde: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="hasta" className="text-xs text-muted-foreground">
                    Hasta
                  </Label>
                  <Input
                    id="hasta"
                    type="date"
                    value={rango.hasta}
                    min={rango.desde}
                    onChange={(e) => e.target.value && setRango((r) => ({ ...r, hasta: e.target.value }))}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 @3xl/main:ml-auto">
              <Button variant="secondary" className="flex-1" disabled={!!exportando} onClick={() => onExportar('excel')}>
                {exportando === 'excel' ? <LoaderCircle className="animate-spin" /> : <FileSpreadsheet />} Excel
              </Button>
              <Button variant="secondary" className="flex-1" disabled={!!exportando} onClick={() => onExportar('pdf')}>
                {exportando === 'pdf' ? <LoaderCircle className="animate-spin" /> : <FileText />} PDF
              </Button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Ventas de hoy, {fechaCorta(rango.hasta, true)}.</p>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : isError || !r ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          No se pudieron cargar los reportes.
          <Button variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        // Al cambiar el rango se conserva lo anterior atenuado mientras llega lo nuevo
        <div className={cn('flex flex-col gap-6 transition-opacity', isFetching && isPlaceholderData && 'opacity-60')} aria-busy={isFetching}>
          <p className="text-sm text-muted-foreground">
            {unDia ? fechaCorta(r.desde, true) : `Del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}`}
          </p>
          <Indicadores r={r} />

          {!unDia && (
            <Seccion titulo="Ventas por día" descripcion="Total cobrado cada día">
              <VentasPorDia datos={r.por_dia} />
            </Seccion>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Seccion titulo="Ventas por hora" descripcion="Cuándo se vende más">
              <VentasPorHora datos={r.por_hora} />
            </Seccion>
            <Seccion titulo="Métodos de pago">
              <MetodosPago datos={r.por_metodo} />
            </Seccion>
          </div>

          <Seccion titulo="Productos más vendidos" descripcion="Por piezas vendidas">
            <TopProductos datos={r.top_productos} />
          </Seccion>

          {!unDia && (
            <section className="flex flex-col gap-3" aria-labelledby="tabla-dias">
              <h2 id="tabla-dias" className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                Detalle por día
              </h2>
              <ResponsiveTable
                caption="Ventas por día"
                rows={[...r.por_dia].reverse()}
                getKey={(d) => d.fecha}
                title={(d) => fechaCorta(d.fecha, true)}
                columns={[
                  { key: 'fecha', header: 'Fecha', cell: (d) => fechaCorta(d.fecha, true), hideOnMobile: true },
                  { key: 'ordenes', header: 'Órdenes', numeric: true, cell: (d) => d.ordenes },
                  { key: 'total', header: 'Ventas', numeric: true, cell: (d) => formatMoney(d.total) },
                ]}
              />
            </section>
          )}
        </div>
      )}
    </div>
  )
}
