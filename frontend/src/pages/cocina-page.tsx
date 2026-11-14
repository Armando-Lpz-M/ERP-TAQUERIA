import { ChefHat, CheckCheck, Flame, LoaderCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAvanzarPedido, usePendientesCocina, type OrdenCocina } from '@/features/cocina/api'
import { useNow } from '@/hooks/use-now'
import { tiempoTranscurrido } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Minutos de espera para avisar con color */
const AVISO_MIN = 15
const URGENTE_MIN = 25

function PedidoCard({ orden, ahora }: { orden: OrdenCocina; ahora: number }) {
  const avanzar = useAvanzarPedido()
  const minutos = (ahora - new Date(orden.creada).getTime()) / 60_000
  const nueva = orden.estado === 'abierta'
  const siguiente = nueva ? 'en_proceso' : 'lista'

  return (
    <Card
      className={cn(
        'gap-3',
        minutos >= URGENTE_MIN ? 'border-destructive/60' : minutos >= AVISO_MIN ? 'border-warning/50' : undefined,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-3xl tracking-wide">{orden.referencia}</h3>
          <p className="text-sm text-muted-foreground">#{orden.id}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-sm font-medium tabular-nums',
            minutos >= URGENTE_MIN
              ? 'bg-destructive/15 text-destructive'
              : minutos >= AVISO_MIN
                ? 'bg-warning/15 text-warning'
                : 'bg-secondary text-muted-foreground',
          )}
        >
          {tiempoTranscurrido(orden.creada, ahora)}
        </span>
      </CardHeader>
      <CardContent>
        {orden.items.length === 0 ? (
          <p className="text-muted-foreground italic">Sin productos todavía</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {orden.items.map((item, i) => (
              <li key={i} className="text-lg leading-snug">
                <span className="mr-2 font-display text-2xl text-primary tabular-nums">{item.cantidad}×</span>
                <span className="font-medium">{item.producto}</span>
                {item.notas && (
                  <p className="mt-0.5 rounded-md bg-warning/10 px-2 py-1 text-base text-warning">⚠ {item.notas}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Button
          size="lg"
          className={cn('h-14 w-full text-base', !nueva && 'bg-success text-success-foreground hover:bg-success/90')}
          disabled={avanzar.isPending || orden.items.length === 0}
          onClick={() =>
            avanzar.mutate(
              { id: orden.id, estado: siguiente },
              {
                onSuccess: () => toast.success(nueva ? `${orden.referencia}: en preparación` : `${orden.referencia}: ¡lista!`),
                onError: (err) => toast.error(err.message),
              },
            )
          }
        >
          {avanzar.isPending ? <LoaderCircle className="animate-spin" /> : nueva ? <Flame /> : <CheckCheck />}
          {nueva ? 'Empezar a preparar' : 'Marcar como lista'}
        </Button>
      </CardFooter>
    </Card>
  )
}

function Columna({ titulo, ordenes, ahora, vacio }: { titulo: string; ordenes: OrdenCocina[]; ahora: number; vacio: string }) {
  return (
    <section className="flex flex-col gap-4" aria-label={titulo}>
      <h2 className="flex items-center gap-2 text-sm font-medium tracking-widest text-muted-foreground uppercase">
        {titulo}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs tabular-nums">{ordenes.length}</span>
      </h2>
      {ordenes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">{vacio}</p>
      ) : (
        ordenes.map((o) => <PedidoCard key={o.id} orden={o} ahora={ahora} />)
      )}
    </section>
  )
}

export function CocinaPage() {
  const ahora = useNow()
  const { data: pedidos, isPending, isError, refetch, isFetching } = usePendientesCocina()

  if (isPending) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        No se pudieron cargar los pedidos.
        <Button variant="secondary" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const nuevas = pedidos.filter((p) => p.estado === 'abierta')
  const enProceso = pedidos.filter((p) => p.estado === 'en_proceso')

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-muted-foreground">
          <ChefHat className="size-5 text-primary" aria-hidden />
          {pedidos.length === 0 ? 'Sin pedidos pendientes' : `${pedidos.length} pedido${pedidos.length === 1 ? '' : 's'} en cocina`}
        </p>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className={isFetching ? 'animate-spin' : ''} /> Actualizar
        </Button>
      </div>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <Columna titulo="Nuevos" ordenes={nuevas} ahora={ahora} vacio="No hay pedidos nuevos" />
        <Columna titulo="En preparación" ordenes={enProceso} ahora={ahora} vacio="Nada en preparación" />
      </div>
    </div>
  )
}
