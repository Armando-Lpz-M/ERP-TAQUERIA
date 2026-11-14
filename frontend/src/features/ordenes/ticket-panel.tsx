import { MessageSquareText, Minus, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/format'

import type { ItemOrden, Orden } from './types'

interface TicketPanelProps {
  orden: Orden
  editable: boolean
  ocupado?: boolean
  onCantidad: (item: ItemOrden, cantidad: number) => void
  onQuitar: (item: ItemOrden) => void
  onNota: (item: ItemOrden) => void
  acciones?: ReactNode
}

export function TicketPanel({ orden, editable, ocupado, onCantidad, onQuitar, onNota, acciones }: TicketPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {orden.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {editable ? 'Toca un producto del menú para agregarlo.' : 'Esta orden no tiene productos.'}
          </p>
        ) : (
          <ul className="divide-y divide-border" aria-label="Productos de la orden">
            {orden.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">{item.producto_nombre}</p>
                    <p className="text-xs text-muted-foreground">{formatMoney(item.precio_unitario)} c/u</p>
                    {item.notas && <p className="mt-1 text-sm text-warning">“{item.notas}”</p>}
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">{formatMoney(item.subtotal)}</span>
                </div>
                {editable && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-9"
                      disabled={ocupado}
                      onClick={() => (item.cantidad > 1 ? onCantidad(item, item.cantidad - 1) : onQuitar(item))}
                      aria-label={item.cantidad > 1 ? `Quitar uno de ${item.producto_nombre}` : `Eliminar ${item.producto_nombre}`}
                    >
                      {item.cantidad > 1 ? <Minus /> : <Trash2 className="text-destructive" />}
                    </Button>
                    <span className="w-9 text-center font-semibold tabular-nums" aria-live="polite">
                      {item.cantidad}
                    </span>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-9"
                      disabled={ocupado}
                      onClick={() => onCantidad(item, item.cantidad + 1)}
                      aria-label={`Agregar uno de ${item.producto_nombre}`}
                    >
                      <Plus />
                    </Button>
                    <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => onNota(item)}>
                      <MessageSquareText /> {item.notas ? 'Editar nota' : 'Nota'}
                    </Button>
                  </div>
                )}
                {!editable && <p className="text-sm text-muted-foreground">Cantidad: {item.cantidad}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm tracking-widest text-muted-foreground uppercase">Total</span>
          <span className="font-display text-4xl tracking-wide text-primary">{formatMoney(orden.total)}</span>
        </div>
        {acciones}
      </div>
    </div>
  )
}
