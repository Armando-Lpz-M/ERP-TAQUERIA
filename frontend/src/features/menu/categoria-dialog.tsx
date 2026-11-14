import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { aplicarErroresServidor } from '@/lib/forms'

import { useGuardarCategoria } from './api'
import type { Categoria } from './types'

const schema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre').max(100),
  descripcion: z.string().max(300),
})
type Form = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoria?: Categoria | null
}

export function CategoriaDialog({ open, onOpenChange, categoria }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {open && <CategoriaForm categoria={categoria} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CategoriaForm({ categoria, onDone }: { categoria?: Categoria | null; onDone: () => void }) {
  const guardar = useGuardarCategoria()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: categoria?.nombre ?? '', descripcion: categoria?.descripcion ?? '' },
  })

  const onSubmit = handleSubmit((form) =>
    guardar.mutate(
      { id: categoria?.id, ...form },
      {
        onSuccess: () => {
          toast.success(categoria ? 'Categoría actualizada' : 'Categoría creada')
          onDone()
        },
        onError: (err) => aplicarErroresServidor(err, setError, ['nombre', 'descripcion']),
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{categoria ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        <DialogDescription>Agrupa los productos del menú (Tacos, Bebidas…).</DialogDescription>
      </DialogHeader>
      <FormField id="cat-nombre" label="Nombre" error={errors.nombre?.message}>
        <Input id="cat-nombre" autoFocus aria-invalid={!!errors.nombre} {...register('nombre')} />
      </FormField>
      <FormField id="cat-desc" label="Descripción (opcional)" error={errors.descripcion?.message}>
        <Input id="cat-desc" {...register('descripcion')} />
      </FormField>
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
