import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIngredientes } from '@/features/inventario/api'
import { ApiError } from '@/lib/api'

import { useGuardarReceta } from './api'
import type { ProductoAdmin } from './types'

interface Fila {
  key: number
  ingrediente_id: string
  cantidad: string
}

const CANTIDAD_VALIDA = /^\d+(\.\d{1,3})?$/

interface Props {
  producto: ProductoAdmin | null
  onClose: () => void
}

export function RecetaDialog({ producto, onClose }: Props) {
  return (
    <Dialog open={!!producto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        {producto && <RecetaForm key={producto.id} producto={producto} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

let siguienteKey = 1

function RecetaForm({ producto, onDone }: { producto: ProductoAdmin; onDone: () => void }) {
  const { data: ingredientes = [], isPending } = useIngredientes()
  const guardar = useGuardarReceta()
  const [filas, setFilas] = useState<Fila[]>(() =>
    producto.receta.map((r) => ({ key: siguienteKey++, ingrediente_id: String(r.ingrediente.id), cantidad: Number(r.cantidad).toString() })),
  )
  const [intentado, setIntentado] = useState(false)

  const usados = new Set(filas.map((f) => f.ingrediente_id))
  const errorDe = (f: Fila) => {
    if (!f.ingrediente_id) return 'Elige un ingrediente'
    if (!CANTIDAD_VALIDA.test(f.cantidad) || Number(f.cantidad) <= 0) return 'Cantidad inválida'
    return null
  }
  const valido = filas.every((f) => !errorDe(f))

  function actualizar(key: number, cambios: Partial<Fila>) {
    setFilas((fs) => fs.map((f) => (f.key === key ? { ...f, ...cambios } : f)))
  }

  function onGuardar() {
    setIntentado(true)
    if (!valido) return
    guardar.mutate(
      {
        id: producto.id,
        ingredientes: filas.map((f) => ({ ingrediente_id: Number(f.ingrediente_id), cantidad: f.cantidad })),
      },
      {
        onSuccess: () => {
          toast.success('Receta guardada')
          onDone()
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la receta'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Receta: {producto.nombre}</DialogTitle>
        <DialogDescription>
          Cuánto lleva <strong>una pieza</strong>. Al cobrar, estos ingredientes se descuentan del inventario.
        </DialogDescription>
      </DialogHeader>

      {!isPending && ingredientes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Primero registra ingredientes en Inventario.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filas.map((fila) => {
            const ing = ingredientes.find((i) => String(i.id) === fila.ingrediente_id)
            const error = intentado ? errorDe(fila) : null
            return (
              <li key={fila.key} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Select value={fila.ingrediente_id} onValueChange={(v) => actualizar(fila.key, { ingrediente_id: v })}>
                    <SelectTrigger className="min-w-0 flex-1" aria-label="Ingrediente">
                      <SelectValue placeholder="Ingrediente…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredientes.map((i) => (
                        <SelectItem
                          key={i.id}
                          value={String(i.id)}
                          disabled={usados.has(String(i.id)) && String(i.id) !== fila.ingrediente_id}
                        >
                          {i.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative w-28 shrink-0">
                    <Input
                      inputMode="decimal"
                      value={fila.cantidad}
                      onChange={(e) => actualizar(fila.key, { cantidad: e.target.value })}
                      placeholder="0"
                      aria-label="Cantidad por pieza"
                      aria-invalid={!!error}
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
                      {ing?.unidad ?? ''}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFilas((fs) => fs.filter((f) => f.key !== fila.key))}
                    aria-label="Quitar ingrediente"
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </li>
            )
          })}
        </ul>
      )}

      <Button
        variant="secondary"
        className="self-start"
        disabled={filas.length >= ingredientes.length}
        onClick={() => setFilas((fs) => [...fs, { key: siguienteKey++, ingrediente_id: '', cantidad: '' }])}
      >
        <Plus /> Agregar ingrediente
      </Button>

      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button onClick={onGuardar} disabled={guardar.isPending}>
          {guardar.isPending && <LoaderCircle className="animate-spin" />}
          Guardar receta
        </Button>
      </DialogFooter>
    </div>
  )
}
