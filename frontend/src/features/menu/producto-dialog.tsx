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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { aplicarErroresServidor, decimalPositivo } from '@/lib/forms'

import { useCategorias, useGuardarProducto } from './api'
import type { ProductoAdmin } from './types'

const schema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre').max(150),
  categoria_id: z.string().min(1, 'Elige una categoría'),
  precio: decimalPositivo('Escribe un precio válido (ej. 18.50)'),
  descripcion: z.string().max(500),
  disponible: z.boolean(),
})
type Form = z.infer<typeof schema>
const CAMPOS = ['nombre', 'categoria_id', 'precio', 'descripcion', 'disponible'] as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  producto?: ProductoAdmin | null
}

export function ProductoDialog({ open, onOpenChange, producto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        {open && <ProductoForm producto={producto} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ProductoForm({ producto, onDone }: { producto?: ProductoAdmin | null; onDone: () => void }) {
  const { data: categorias = [] } = useCategorias()
  const guardar = useGuardarProducto()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: producto?.nombre ?? '',
      categoria_id: producto?.categoria ? String(producto.categoria.id) : '',
      precio: producto?.precio ?? '',
      descripcion: producto?.descripcion ?? '',
      disponible: producto?.disponible ?? true,
    },
  })

  const onSubmit = handleSubmit((form) => {
    guardar.mutate(
      { id: producto?.id, ...form, categoria_id: Number(form.categoria_id) },
      {
        onSuccess: () => {
          toast.success(producto ? 'Producto actualizado' : 'Producto agregado al menú')
          onDone()
        },
        onError: (err) => aplicarErroresServidor(err, setError, CAMPOS),
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{producto ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        <DialogDescription>Lo que se muestra en el menú al tomar una orden.</DialogDescription>
      </DialogHeader>

      <FormField id="nombre" label="Nombre" error={errors.nombre?.message}>
        <Input id="nombre" autoFocus placeholder="Ej. Taco al pastor" aria-invalid={!!errors.nombre} {...register('nombre')} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="categoria" label="Categoría" error={errors.categoria_id?.message}>
          <Controller
            control={control}
            name="categoria_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="categoria" className="w-full" aria-invalid={!!errors.categoria_id}>
                  <SelectValue placeholder={categorias.length ? 'Elige…' : 'Crea una categoría primero'} />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField id="precio" label="Precio" error={errors.precio?.message}>
          <Input id="precio" inputMode="decimal" placeholder="0.00" aria-invalid={!!errors.precio} {...register('precio')} />
        </FormField>
      </div>

      <FormField id="descripcion" label="Descripción (opcional)" error={errors.descripcion?.message}>
        <Textarea id="descripcion" rows={2} {...register('descripcion')} />
      </FormField>

      <Controller
        control={control}
        name="disponible"
        render={({ field }) => (
          <label htmlFor="disponible" className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <span className="flex flex-col">
              <span className="text-sm font-medium">Disponible</span>
              <span className="text-xs text-muted-foreground">Si está apagado, no aparece al tomar órdenes.</span>
            </span>
            <Switch id="disponible" checked={field.value} onCheckedChange={field.onChange} />
          </label>
        )}
      />

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
