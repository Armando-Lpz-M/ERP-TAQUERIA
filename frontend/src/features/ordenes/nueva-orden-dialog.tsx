import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
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
import { cn } from '@/lib/utils'

import { useCrearOrden, useMesas } from './api'

export function NuevaOrdenDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const { data: mesas = [] } = useMesas()
  const crear = useCrearOrden()
  const [mesa, setMesa] = useState<number | null>(null)
  const [cliente, setCliente] = useState('')

  const valido = mesa !== null || cliente.trim().length > 0

  function cerrar(abierto: boolean) {
    if (!abierto) {
      setMesa(null)
      setCliente('')
    }
    onOpenChange(abierto)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    crear.mutate(
      { mesa, cliente: cliente.trim() },
      {
        onSuccess: (orden) => {
          cerrar(false)
          navigate(`/ordenes/${orden.id}`)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nueva orden</DialogTitle>
            <DialogDescription>Elige la mesa o escribe el nombre del cliente.</DialogDescription>
          </DialogHeader>

          {mesas.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Mesa</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {mesas.map((m) => (
                  <Button
                    key={m.id}
                    type="button"
                    variant="outline"
                    aria-pressed={mesa === m.id}
                    onClick={() => setMesa(mesa === m.id ? null : m.id)}
                    className={cn('h-12 font-display text-xl', mesa === m.id && 'border-primary bg-accent text-accent-foreground')}
                  >
                    {m.numero}
                  </Button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="cliente">{mesas.length > 0 ? 'Nombre del cliente (opcional con mesa)' : 'Nombre del cliente'}</Label>
            <Input
              id="cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Ej. Juan, Para llevar…"
              maxLength={100}
              autoFocus={mesas.length === 0}
              className="h-11"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => cerrar(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valido || crear.isPending}>
              {crear.isPending && <LoaderCircle className="animate-spin" />}
              Crear orden
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
