import { ArrowLeft, Ban, ReceiptText, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/auth-context'
import type { Rol } from '@/features/auth/types'
import {
  useAgregarItem,
  useCancelarOrden,
  useModificarItem,
  useOrden,
  useQuitarItem,
} from '@/features/ordenes/api'
import { CobroDialog } from '@/features/ordenes/cobro-dialog'
import { EstadoBadge } from '@/features/ordenes/estado-badge'
import { MenuPanel } from '@/features/ordenes/menu-panel'
import { NotaDialog } from '@/features/ordenes/nota-dialog'
import { TicketDialog } from '@/features/ordenes/ticket-dialog'
import { TicketPanel } from '@/features/ordenes/ticket-panel'
import type { ItemOrden, Orden, Ticket } from '@/features/ordenes/types'
import { ApiError } from '@/lib/api'
import { formatMoney, tiempoTranscurrido } from '@/lib/format'

const CERRADAS = new Set(['pagada', 'cancelada'])

/** Reglas iguales a las del backend */
function permisos(orden: Orden, rol: Rol | undefined) {
  const cerrada = CERRADAS.has(orden.estado)
  return {
    editar: !cerrada && (rol === 'admin' || rol === 'cajero' || (rol === 'mesero' && orden.estado === 'abierta')),
    cobrar: !cerrada && (rol === 'admin' || rol === 'cajero') && orden.items.length > 0,
    cancelar: !cerrada && (rol === 'admin' || rol === 'cajero' || (rol === 'mesero' && orden.estado === 'abierta')),
  }
}

export function OrdenDetallePage() {
  const id = Number(useParams().id)
  const { data: orden, isPending, error, refetch } = useOrden(id)

  if (isPending) {
    return (
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="hidden h-96 rounded-xl lg:block" />
      </div>
    )
  }

  if (error || !orden) {
    const status = error instanceof ApiError ? error.status : 0
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <ReceiptText className="size-10 text-muted-foreground" aria-hidden />
        <p className="text-lg font-medium">
          {status === 404 ? 'Esta orden no existe.' : status === 403 ? 'No tienes acceso a esta orden.' : 'No se pudo cargar la orden.'}
        </p>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link to="/ordenes">Ver órdenes</Link>
          </Button>
          {status !== 404 && status !== 403 && <Button onClick={() => refetch()}>Reintentar</Button>}
        </div>
      </div>
    )
  }

  return <OrdenDetalle orden={orden} />
}

function OrdenDetalle({ orden }: { orden: Orden }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const puede = permisos(orden, user?.rol)

  const agregar = useAgregarItem(orden.id)
  const modificar = useModificarItem(orden.id)
  const quitar = useQuitarItem(orden.id)
  const cancelar = useCancelarOrden(orden.id)

  const [ticketAbierto, setTicketAbierto] = useState(false) // panel móvil
  const [cobrando, setCobrando] = useState(false)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const [itemNota, setItemNota] = useState<ItemOrden | null>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)

  const onError = (err: Error) => toast.error(err.message)
  const piezas = orden.items.reduce((n, i) => n + i.cantidad, 0)
  const ocupado = modificar.isPending || quitar.isPending

  const acciones = (
    <div className="flex flex-col gap-2">
      {puede.cobrar && (
        <Button
          size="lg"
          className="h-12 bg-success text-base text-success-foreground hover:bg-success/90"
          onClick={() => {
            setTicketAbierto(false)
            setCobrando(true)
          }}
        >
          <Wallet /> Cobrar {formatMoney(orden.total)}
        </Button>
      )}
      {!puede.cobrar && !CERRADAS.has(orden.estado) && user?.rol === 'mesero' && orden.items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">El cobro lo hace caja.</p>
      )}
      {puede.cancelar && (
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmarCancelar(true)}>
          <Ban /> Cancelar orden
        </Button>
      )}
    </div>
  )

  const panel = (
    <TicketPanel
      orden={orden}
      editable={puede.editar}
      ocupado={ocupado}
      onCantidad={(item, cantidad) => modificar.mutate({ itemId: item.id, cantidad }, { onError })}
      onQuitar={(item) => quitar.mutate(item.id, { onError })}
      onNota={setItemNota}
      acciones={acciones}
    />
  )

  return (
    <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Volver a órdenes">
            <Link to="/ordenes">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-3xl tracking-wide">{orden.referencia}</h2>
            <p className="text-sm text-muted-foreground">
              #{orden.id} · {tiempoTranscurrido(orden.creada)}
              {orden.empleado_nombre ? ` · ${orden.empleado_nombre}` : ''}
            </p>
          </div>
          <EstadoBadge estado={orden.estado} className="text-sm" />
        </div>

        {!puede.editar && (
          <p className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
            {orden.estado === 'pagada'
              ? 'Esta orden ya se cobró.'
              : orden.estado === 'cancelada'
                ? 'Esta orden fue cancelada.'
                : 'La orden ya está en cocina; solo caja puede modificarla.'}
          </p>
        )}

        {puede.editar && (
          <MenuPanel
            items={orden.items}
            onAgregar={(producto) => agregar.mutate({ producto_id: producto.id }, { onError })}
          />
        )}

        {/* En celular y tablet el ticket va en un panel; en escritorio, a la derecha */}
        {!puede.editar && (
          <Card className="p-4 lg:hidden">
            <TicketPanel orden={orden} editable={false} onCantidad={() => {}} onQuitar={() => {}} onNota={() => {}} acciones={acciones} />
          </Card>
        )}
      </div>

      <aside className="hidden lg:block" aria-label="Orden actual">
        <Card className="sticky top-20 h-[calc(100svh-6.5rem)] p-4">{panel}</Card>
      </aside>

      {puede.editar && (
        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
          <Button size="lg" className="h-12 w-full justify-between text-base" onClick={() => setTicketAbierto(true)}>
            <span className="flex items-center gap-2">
              <ReceiptText /> Ver orden
              <span className="rounded-full bg-primary-foreground/15 px-2 text-sm tabular-nums">{piezas}</span>
            </span>
            <span className="font-display text-2xl tracking-wide">{formatMoney(orden.total)}</span>
          </Button>
        </div>
      )}

      <Sheet open={ticketAbierto} onOpenChange={setTicketAbierto}>
        <SheetContent side="bottom" className="flex h-[85svh] flex-col gap-0 rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <SheetHeader className="px-0">
            <SheetTitle>{orden.referencia}</SheetTitle>
            <SheetDescription>
              {piezas} {piezas === 1 ? 'producto' : 'productos'}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">{panel}</div>
        </SheetContent>
      </Sheet>

      <NotaDialog
        item={itemNota}
        onClose={() => setItemNota(null)}
        onGuardar={(notas) => {
          if (!itemNota) return
          modificar.mutate({ itemId: itemNota.id, notas }, { onError, onSuccess: () => setItemNota(null) })
        }}
      />

      <CobroDialog
        orden={orden}
        open={cobrando}
        onOpenChange={setCobrando}
        onCobrado={(t) => {
          setCobrando(false)
          setTicket(t)
        }}
      />

      <TicketDialog
        ticket={ticket}
        onClose={() => {
          setTicket(null)
          navigate('/ordenes')
        }}
      />

      <AlertDialog open={confirmarCancelar} onOpenChange={setConfirmarCancelar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la orden de {orden.referencia}?</AlertDialogTitle>
            <AlertDialogDescription>
              La orden dejará de aparecer en caja y en cocina. Esta acción queda registrada y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, volver</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                cancelar.mutate(undefined, {
                  onError,
                  onSuccess: () => {
                    toast.success('Orden cancelada')
                    navigate('/ordenes')
                  },
                })
              }
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
