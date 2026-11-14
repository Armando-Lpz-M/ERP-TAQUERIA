import { Plus, ReceiptText, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrdenesActivas } from '@/features/ordenes/api'
import { EstadoBadge } from '@/features/ordenes/estado-badge'
import { NuevaOrdenDialog } from '@/features/ordenes/nueva-orden-dialog'
import type { EstadoOrden, Orden } from '@/features/ordenes/types'
import { formatMoney, tiempoTranscurrido } from '@/lib/format'

type Filtro = 'todas' | Extract<EstadoOrden, 'abierta' | 'en_proceso' | 'lista'>

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'abierta', label: 'Abiertas' },
  { value: 'en_proceso', label: 'En cocina' },
  { value: 'lista', label: 'Listas' },
]

function OrdenCard({ orden }: { orden: Orden }) {
  const piezas = orden.items.reduce((n, item) => n + item.cantidad, 0)
  return (
    <Link to={`/ordenes/${orden.id}`} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-colors hover:border-primary/40 hover:bg-secondary">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate font-display text-2xl tracking-wide">{orden.referencia}</CardTitle>
            <p className="text-xs text-muted-foreground">
              #{orden.id} · {tiempoTranscurrido(orden.creada)}
              {orden.empleado_nombre ? ` · ${orden.empleado_nombre}` : ''}
            </p>
          </div>
          <EstadoBadge estado={orden.estado} />
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {orden.items.length === 0 ? (
            <span className="italic">Sin productos</span>
          ) : (
            <p className="line-clamp-2">
              {orden.items.map((item) => `${item.cantidad}× ${item.producto_nombre}`).join(', ')}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-sm text-muted-foreground">
            {piezas} {piezas === 1 ? 'producto' : 'productos'}
          </span>
          <span className="font-display text-2xl tracking-wide text-primary">{formatMoney(orden.total)}</span>
        </CardFooter>
      </Card>
    </Link>
  )
}

export function OrdenesPage() {
  const [nueva, setNueva] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const { data: ordenes, isPending, isError, refetch, isFetching } = useOrdenesActivas()

  const conteo = useMemo(() => {
    const c: Record<Filtro, number> = { todas: 0, abierta: 0, en_proceso: 0, lista: 0 }
    for (const o of ordenes ?? []) {
      c.todas++
      if (o.estado in c) c[o.estado as Filtro]++
    }
    return c
  }, [ordenes])

  const visibles = (ordenes ?? []).filter((o) => filtro === 'todas' || o.estado === filtro)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)} className="max-w-full overflow-x-auto">
          <TabsList>
            {FILTROS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="gap-1.5">
                {f.label}
                <span className="rounded-full bg-background/60 px-1.5 text-xs tabular-nums">{conteo[f.value]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Actualizar">
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
          </Button>
          <Button onClick={() => setNueva(true)} size="lg">
            <Plus /> Nueva orden
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="items-center p-8 text-center">
          <p className="text-muted-foreground">No se pudieron cargar las órdenes.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : visibles.length === 0 ? (
        <Card className="items-center gap-3 p-10 text-center">
          <ReceiptText className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-lg font-medium">{filtro === 'todas' ? 'No hay órdenes activas' : 'Nada en esta sección'}</p>
          {filtro === 'todas' && (
            <Button onClick={() => setNueva(true)}>
              <Plus /> Crear la primera
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((orden) => (
            <OrdenCard key={orden.id} orden={orden} />
          ))}
        </div>
      )}

      <NuevaOrdenDialog open={nueva} onOpenChange={setNueva} />
    </div>
  )
}
