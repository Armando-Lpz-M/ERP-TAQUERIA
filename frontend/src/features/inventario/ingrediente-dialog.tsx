import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { aplicarErroresServidor, decimal } from '@/lib/forms'

import { useGuardarIngrediente } from './api'
import { UNIDADES, type Ingrediente, type Unidad } from './types'

const schema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre').max(100),
  unidad: z.string().min(1, 'Elige la unidad'),
  stock_actual: decimal(),
  stock_minimo: decimal(),
})
type Form = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingrediente?: Ingrediente | null
}

export function IngredienteDialog({ open, onOpenChange, ingrediente }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        {open && <IngredienteForm ingrediente={ingrediente} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function IngredienteForm({ ingrediente, onDone }: { ingrediente?: Ingrediente | null; onDone: () => void }) {
  const guardar = useGuardarIngrediente()
  const editando = !!ingrediente
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: ingrediente?.nombre ?? '',
      unidad: ingrediente?.unidad ?? '',
      stock_actual: ingrediente ? Number(ingrediente.stock_actual).toString() : '0',
      stock_minimo: ingrediente ? Number(ingrediente.stock_minimo).toString() : '0',
    },
  })

  const onSubmit = handleSubmit(({ stock_actual, ...form }) =>
    guardar.mutate(
      // El stock solo se manda al crear; después cambia con entradas y salidas
      { id: ingrediente?.id, ...form, unidad: form.unidad as Unidad, ...(editando ? {} : { stock_actual }) },
      {
        onSuccess: () => {
          toast.success(editando ? 'Ingrediente actualizado' : 'Ingrediente registrado')
          onDone()
        },
        onError: (err) => aplicarErroresServidor(err, setError, ['nombre', 'unidad', 'stock_actual', 'stock_minimo']),
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{editando ? 'Editar ingrediente' : 'Nuevo ingrediente'}</DialogTitle>
        <DialogDescription>Los ingredientes se usan en las recetas y se descuentan al vender.</DialogDescription>
      </DialogHeader>
      <FormField id="ing-nombre" label="Nombre" error={errors.nombre?.message}>
        <Input id="ing-nombre" autoFocus placeholder="Ej. Carne al pastor" aria-invalid={!!errors.nombre} {...register('nombre')} />
      </FormField>
      <FormField id="ing-unidad" label="Unidad" error={errors.unidad?.message}>
        <Controller
          control={control}
          name="unidad"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ing-unidad" className="w-full" aria-invalid={!!errors.unidad}>
                <SelectValue placeholder="Elige…" />
              </SelectTrigger>
              <SelectContent>
                {UNIDADES.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        {!editando && (
          <FormField id="ing-stock" label="Stock inicial" error={errors.stock_actual?.message}>
            <Input id="ing-stock" inputMode="decimal" aria-invalid={!!errors.stock_actual} {...register('stock_actual')} />
          </FormField>
        )}
        <FormField
          id="ing-min"
          label="Stock mínimo"
          error={errors.stock_minimo?.message}
          hint="Por debajo de esto se marca como stock bajo."
        >
          <Input id="ing-min" inputMode="decimal" aria-invalid={!!errors.stock_minimo} {...register('stock_minimo')} />
        </FormField>
      </div>
      {editando && (
        <p className="text-xs text-muted-foreground">
          Para cambiar el stock registra una entrada o una salida; así queda el historial.
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending && <LoaderCircle className="animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}
