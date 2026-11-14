import { Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatFechaHora, formatMoney } from '@/lib/format'

import { METODO_LABEL, type Ticket } from './types'

interface TicketDialogProps {
  ticket: Ticket | null
  onClose: () => void
}

export function TicketDialog({ ticket, onClose }: TicketDialogProps) {
  return (
    <Dialog open={!!ticket} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-sm" showCloseButton={false}>
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle>¡Cobro registrado!</DialogTitle>
              <DialogDescription>
                {ticket.orden.referencia} · {formatMoney(ticket.total)} · {METODO_LABEL[ticket.metodo_pago]}
              </DialogDescription>
            </DialogHeader>

            {/* Papel del ticket: es lo único que se imprime */}
            <div id="ticket-imprimible" className="rounded-lg bg-[#fbf8f1] p-5 font-mono text-sm text-[#1c1a17] shadow-inner">
              <p className="text-center font-display text-2xl tracking-widest">🌮 Taquería ERP</p>
              <p className="text-center text-xs text-[#6b665c]">
                {formatFechaHora(ticket.fecha)} · Ticket #{ticket.id}
              </p>
              <p className="text-center text-xs text-[#6b665c]">{ticket.orden.referencia}</p>
              <hr className="my-3 border-dashed border-[#c9c2b3]" />
              <ul className="flex flex-col gap-1">
                {ticket.orden.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.cantidad}× {item.producto_nombre}
                    </span>
                    <span className="tabular-nums">{formatMoney(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <hr className="my-3 border-dashed border-[#c9c2b3]" />
              <p className="flex justify-between text-base font-bold">
                <span>TOTAL</span>
                <span className="tabular-nums">{formatMoney(ticket.total)}</span>
              </p>
              <p className="mt-1 flex justify-between text-xs text-[#6b665c]">
                <span>Pago</span>
                <span>{METODO_LABEL[ticket.metodo_pago]}</span>
              </p>
              {ticket.metodo_pago === 'efectivo' && ticket.pagado_con && (
                <>
                  <p className="flex justify-between text-xs text-[#6b665c]">
                    <span>Pagó con</span>
                    <span className="tabular-nums">{formatMoney(ticket.pagado_con)}</span>
                  </p>
                  <p className="flex justify-between text-xs text-[#6b665c]">
                    <span>Cambio</span>
                    <span className="tabular-nums">{formatMoney(ticket.cambio)}</span>
                  </p>
                </>
              )}
              <p className="mt-4 text-center text-xs">¡Gracias por su visita!</p>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer /> Imprimir
              </Button>
              <Button onClick={onClose}>Listo</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
