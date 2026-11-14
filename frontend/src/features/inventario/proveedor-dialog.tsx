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

import { useGuardarProveedor } from './api'
import type { Proveedor } from './types'

const schema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre').max(150),
  contacto: z.string().max(100),
  telefono: z.string().max(20),
  email: z.union([z.literal(''), z.email('Correo no válido')]),
})
type Form = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proveedor?: Proveedor | null
}

export function ProveedorDialog({ open, onOpenChange, proveedor }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        {open && <ProveedorForm proveedor={proveedor} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ProveedorForm({ proveedor, onDone }: { proveedor?: Proveedor | null; onDone: () => void }) {
  const guardar = useGuardarProveedor()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: proveedor?.nombre ?? '',
      contacto: proveedor?.contacto ?? '',
      telefono: proveedor?.telefono ?? '',
      email: proveedor?.email ?? '',
    },
  })

  const onSubmit = handleSubmit((form) =>
    guardar.mutate(
      { id: proveedor?.id, ...form },
      {
        onSuccess: () => {
          toast.success(proveedor ? 'Proveedor actualizado' : 'Proveedor registrado')
          onDone()
        },
        onError: (err) => aplicarErroresServidor(err, setError, ['nombre', 'contacto', 'telefono', 'email']),
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
        <DialogDescription>A quién le compras la mercancía.</DialogDescription>
      </DialogHeader>
      <FormField id="prov-nombre" label="Nombre" error={errors.nombre?.message}>
        <Input id="prov-nombre" autoFocus aria-invalid={!!errors.nombre} {...register('nombre')} />
      </FormField>
      <FormField id="prov-contacto" label="Persona de contacto" error={errors.contacto?.message}>
        <Input id="prov-contacto" {...register('contacto')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="prov-tel" label="Teléfono" error={errors.telefono?.message}>
          <Input id="prov-tel" type="tel" inputMode="tel" {...register('telefono')} />
        </FormField>
        <FormField id="prov-email" label="Correo" error={errors.email?.message}>
          <Input id="prov-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
        </FormField>
      </div>
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
