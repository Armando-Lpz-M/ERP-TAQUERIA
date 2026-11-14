import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { aplicarErroresServidor } from '@/lib/forms'

import { useAcceso } from './api'
import type { Empleado } from './types'

const schema = z.object({
  username: z.string().trim(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})
type Form = z.infer<typeof schema>

export function AccesoDialog({ empleado, onClose }: { empleado: Empleado | null; onClose: () => void }) {
  return (
    <Dialog open={!!empleado} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">{empleado && <AccesoForm key={empleado.id} empleado={empleado} onDone={onClose} />}</DialogContent>
    </Dialog>
  )
}

function AccesoForm({ empleado, onDone }: { empleado: Empleado; onDone: () => void }) {
  const acceso = useAcceso()
  const [ver, setVer] = useState(false)
  const nueva = !empleado.tiene_acceso
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } })

  const onSubmit = handleSubmit((f) => {
    if (nueva && !/^[\w.@+-]{3,150}$/.test(f.username)) {
      setError('username', { message: 'Mínimo 3 caracteres, sin espacios' })
      return
    }
    acceso.mutate(
      { id: empleado.id, password: f.password, ...(nueva ? { username: f.username } : {}) },
      {
        onSuccess: () => {
          toast.success(nueva ? 'Acceso creado' : 'Contraseña actualizada')
          onDone()
        },
        onError: (err) => aplicarErroresServidor(err, setError, ['username', 'password']),
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{nueva ? 'Dar acceso al sistema' : 'Cambiar contraseña'}</DialogTitle>
        <DialogDescription>
          {empleado.nombre} {empleado.apellido}
          {!nueva && ` · usuario: ${empleado.usuario_username}`}
        </DialogDescription>
      </DialogHeader>
      {nueva && (
        <FormField id="acc-user" label="Usuario" error={errors.username?.message}>
          <Input id="acc-user" autoFocus autoComplete="off" autoCapitalize="none" aria-invalid={!!errors.username} {...register('username')} />
        </FormField>
      )}
      <FormField id="acc-pass" label={nueva ? 'Contraseña' : 'Contraseña nueva'} error={errors.password?.message}>
        <div className="relative">
          <Input
            id="acc-pass"
            type={ver ? 'text' : 'password'}
            autoFocus={!nueva}
            autoComplete="new-password"
            className="pr-10"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setVer((v) => !v)}
            aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {ver ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={acceso.isPending}>
          {acceso.isPending && <LoaderCircle className="animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}
