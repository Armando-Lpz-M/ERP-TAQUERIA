import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

import type { ItemOrden } from './types'

const SUGERENCIAS = ['Sin cebolla', 'Sin cilantro', 'Con todo', 'Sin salsa', 'Para llevar', 'Bien dorado']

interface NotaDialogProps {
  item: ItemOrden | null
  onClose: () => void
  onGuardar: (notas: string) => void
}

export function NotaDialog({ item, onClose, onGuardar }: NotaDialogProps) {
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* key reinicia el formulario al cambiar de producto */}
        {item && <NotaForm key={item.id} item={item} onClose={onClose} onGuardar={onGuardar} />}
      </DialogContent>
    </Dialog>
  )
}

function NotaForm({ item, onClose, onGuardar }: { item: ItemOrden } & Omit<NotaDialogProps, 'item'>) {
  const [notas, setNotas] = useState(item.notas)

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onGuardar(notas.trim())
      }}
    >
      <DialogHeader>
        <DialogTitle>Nota para cocina</DialogTitle>
        <DialogDescription>
          {item.cantidad}× {item.producto_nombre}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-2">
        {SUGERENCIAS.map((s) => (
          <Button
            key={s}
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => setNotas((n) => (n ? `${n}, ${s.toLowerCase()}` : s))}
          >
            {s}
          </Button>
        ))}
      </div>
      <Textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Ej. sin cebolla, salsa aparte…"
        maxLength={500}
        rows={3}
        aria-label="Nota"
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Guardar nota</Button>
      </DialogFooter>
    </form>
  )
}
