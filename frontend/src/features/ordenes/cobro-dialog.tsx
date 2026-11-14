import { ArrowRightLeft, Banknote, CreditCard, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatMoney, toNumber } from '@/lib/format'

import { useCobrarOrden } from './api'
import { METODO_LABEL, type MetodoPago, type Orden, type Ticket } from './types'

const METODOS: { value: MetodoPago; icon: typeof Banknote }[] = [
  { value: 'efectivo', icon: Banknote },
  { value: 'tarjeta', icon: CreditCard },
  { value: 'transferencia', icon: ArrowRightLeft },
]

const BILLETES = [20, 50, 100, 200, 500, 1000]

/** Montos rápidos: exacto y los siguientes billetes que alcanzan */
function montosRapidos(total: number) {
  const siguientes = BILLETES.filter((b) => b > total).slice(0, 3)
  return [total, ...siguientes]
}

interface CobroDialogProps {
  orden: Orden
  open: boolean
  onOpenChange: (open: boolean) => void
  onCobrado: (ticket: Ticket) => void
}

export function CobroDialog({ orden, open, onOpenChange, onCobrado }: CobroDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        {open && <CobroForm orden={orden} onCancel={() => onOpenChange(false)} onCobrado={onCobrado} />}
      </DialogContent>
    </Dialog>
  )
}

function CobroForm({ orden, onCancel, onCobrado }: { orden: Orden; onCancel: () => void; onCobrado: (t: Ticket) => void }) {
  const cobrar = useCobrarOrden(orden.id)
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [pagaCon, setPagaCon] = useState('')

  const total = toNumber(orden.total)
  const pago = pagaCon === '' ? total : toNumber(pagaCon)
  const insuficiente = metodo === 'efectivo' && pago < total
  const cambio = metodo === 'efectivo' && !insuficiente ? pago - total : 0

  function confirmar() {
    cobrar.mutate(
      { metodo_pago: metodo, ...(metodo === 'efectivo' ? { pagado_con: pago.toFixed(2) } : {}) },
      {
        onSuccess: onCobrado,
        onError: (err) => toast.error(err.message),
      },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Cobrar orden</DialogTitle>
        <DialogDescription>
          {orden.referencia} · #{orden.id}
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-xl border border-border bg-secondary p-4 text-center">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">Total a cobrar</p>
        <p className="font-display text-5xl tracking-wide text-primary">{formatMoney(total)}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label id="metodo-label">Método de pago</Label>
        <ToggleGroup
          type="single"
          value={metodo}
          onValueChange={(v) => v && setMetodo(v as MetodoPago)}
          aria-labelledby="metodo-label"
          variant="outline"
          className="grid w-full grid-cols-3"
        >
          {METODOS.map(({ value, icon: Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="h-16 flex-col gap-1 data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              <Icon className="size-5" />
              <span className="text-xs">{METODO_LABEL[value]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {metodo === 'efectivo' && (
        <div className="flex flex-col gap-3">
          <Label htmlFor="paga-con">Paga con</Label>
          <Input
            id="paga-con"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={pagaCon}
            onChange={(e) => setPagaCon(e.target.value)}
            placeholder={total.toFixed(2)}
            aria-invalid={insuficiente}
            className="h-12 text-lg"
          />
          <div className="grid grid-cols-4 gap-2">
            {montosRapidos(total).map((monto, i) => (
              <Button key={monto} type="button" variant="secondary" onClick={() => setPagaCon(monto.toFixed(2))}>
                {i === 0 ? 'Exacto' : formatMoney(monto).replace('.00', '')}
              </Button>
            ))}
          </div>
          {insuficiente ? (
            <p className="text-sm text-destructive" role="alert">
              Faltan {formatMoney(total - pago)}
            </p>
          ) : (
            <div className="flex items-baseline justify-between rounded-lg bg-success/10 px-4 py-3">
              <span className="text-sm text-success">Cambio</span>
              <span className="font-display text-3xl tracking-wide text-success" aria-live="polite">
                {formatMoney(cambio)}
              </span>
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="lg"
          className="bg-success text-success-foreground hover:bg-success/90"
          disabled={insuficiente || cobrar.isPending}
          onClick={confirmar}
        >
          {cobrar.isPending && <LoaderCircle className="animate-spin" />}
          Confirmar pago
        </Button>
      </DialogFooter>
    </div>
  )
}
