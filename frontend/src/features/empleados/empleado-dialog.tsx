import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { aplicarErroresServidor } from '@/lib/forms'

import { useGuardarEmpleado } from './api'
import { ROLES_EMPLEADO, type Empleado, type RolEmpleado } from './types'

const schema = z
  .object({
    nombre: z.string().trim().min(1, 'Escribe el nombre').max(150),
    apellido: z.string().trim().min(1, 'Escribe el apellido').max(150),
    rol: z.string().min(1, 'Elige el rol'),
    telefono: z.string().trim().max(20).regex(/^[\d\s+()-]*$/, 'Solo números'),
    conAcceso: z.boolean(),
    username: z.string().trim(),
    password: z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.conAcceso) return
    if (!/^[\w.@+-]{3,150}$/.test(v.username))
      ctx.addIssue({ code: 'custom', path: ['username'], message: 'Mínimo 3 caracteres, sin espacios' })
    if (v.password.length < 8) ctx.addIssue({ code: 'custom', path: ['password'], message: 'Mínimo 8 caracteres' })
  })
type Form = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  empleado?: Empleado | null
}

export function EmpleadoDialog({ open, onOpenChange, empleado }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        {open && <EmpleadoForm empleado={empleado} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function EmpleadoForm({ empleado, onDone }: { empleado?: Empleado | null; onDone: () => void }) {
  const guardar = useGuardarEmpleado()
  const [verPassword, setVerPassword] = useState(false)
  const editando = !!empleado
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: empleado?.nombre ?? '',
      apellido: empleado?.apellido ?? '',
      rol: empleado?.rol ?? '',
      telefono: empleado?.telefono ?? '',
      conAcceso: !editando,
      username: '',
      password: '',
    },
  })
  const conAcceso = useWatch({ control, name: 'conAcceso' })

  const onSubmit = handleSubmit(({ conAcceso, username, password, ...form }) =>
    guardar.mutate(
      {
        id: empleado?.id,
        ...form,
        rol: form.rol as RolEmpleado,
        ...(!editando && conAcceso ? { username, password } : {}),
      },
      {
        onSuccess: () => {
          toast.success(editando ? 'Empleado actualizado' : 'Empleado registrado')
          onDone()
        },
        onError: (err) => aplicarErroresServidor(err, setError, ['nombre', 'apellido', 'rol', 'telefono', 'username', 'password']),
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{editando ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
        <DialogDescription>El rol define qué partes del sistema puede usar.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="emp-nombre" label="Nombre" error={errors.nombre?.message}>
          <Input id="emp-nombre" autoFocus autoComplete="off" aria-invalid={!!errors.nombre} {...register('nombre')} />
        </FormField>
        <FormField id="emp-apellido" label="Apellido" error={errors.apellido?.message}>
          <Input id="emp-apellido" autoComplete="off" aria-invalid={!!errors.apellido} {...register('apellido')} />
        </FormField>
      </div>

      <FormField id="emp-rol" label="Rol" error={errors.rol?.message}>
        <Controller
          control={control}
          name="rol"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="emp-rol" className="w-full" aria-invalid={!!errors.rol}>
                <SelectValue placeholder="Elige…" />
              </SelectTrigger>
              <SelectContent>
                {ROLES_EMPLEADO.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label} <span className="text-muted-foreground">· {r.descripcion}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField id="emp-tel" label="Teléfono (opcional)" error={errors.telefono?.message}>
        <Input id="emp-tel" type="tel" inputMode="tel" aria-invalid={!!errors.telefono} {...register('telefono')} />
      </FormField>

      {!editando && (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-3">
          <Controller
            control={control}
            name="conAcceso"
            render={({ field }) => (
              <label htmlFor="emp-acceso" className="flex items-center justify-between gap-4">
                <span className="flex flex-col">
                  <span className="text-sm font-medium">Darle acceso al sistema</span>
                  <span className="text-xs text-muted-foreground">Usuario y contraseña para iniciar sesión.</span>
                </span>
                <Switch id="emp-acceso" checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          {conAcceso && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="emp-user" label="Usuario" error={errors.username?.message}>
                <Input id="emp-user" autoComplete="off" autoCapitalize="none" aria-invalid={!!errors.username} {...register('username')} />
              </FormField>
              <FormField id="emp-pass" label="Contraseña" error={errors.password?.message}>
                <div className="relative">
                  <Input
                    id="emp-pass"
                    type={verPassword ? 'text' : 'password'}
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
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {verPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormField>
            </div>
          )}
        </div>
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
