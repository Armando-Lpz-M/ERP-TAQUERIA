import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api'

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Escribe tu usuario'),
  password: z.string().min(1, 'Escribe tu contraseña'),
})

type LoginForm = z.infer<typeof loginSchema>

function mensajeDeError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Usuario o contraseña incorrectos.'
    if (error.status === 403) return error.message
    if (error.status === 429) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    if (error.status >= 500) return 'El servidor no responde. Verifica que Django esté corriendo.'
    return error.message
  }
  return 'No se pudo conectar con el servidor.'
}

const STATS = [
  { valor: '360°', label: 'Control total' },
  { valor: '∞', label: 'Órdenes / día' },
  { valor: '4', label: 'Roles de acceso' },
]

export function LoginPage() {
  const { login } = useAuth()
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setError(null)
    try {
      await login(username, password)
      // RedirectIfAuthenticated se encarga de llevarlo a la página que pidió
    } catch (err) {
      setError(mensajeDeError(err))
    }
  })

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-sidebar lg:flex lg:flex-col lg:justify-end lg:p-14">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]"
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 size-96 rounded-full bg-primary/15 blur-3xl"
        />
        <span aria-hidden className="absolute top-16 right-16 text-8xl motion-safe:animate-bounce [animation-duration:3s]">
          🌮
        </span>

        <div className="relative flex flex-col gap-6">
          <span className="w-fit rounded-full border border-primary/30 bg-accent px-3 py-1 text-xs font-medium tracking-widest text-accent-foreground uppercase">
            Sistema de gestión
          </span>
          <h1 className="font-display text-8xl leading-[0.85] tracking-wide">
            Taquería
            <br />
            <span className="text-primary">ERP</span>
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Gestiona órdenes, inventario, empleados y reportes desde un solo lugar. Rápido, simple y a tu medida.
          </p>
          <dl className="flex gap-10 pt-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-4xl tracking-wide text-primary">{stat.valor}</dd>
                <dd className="text-xs text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-1">
            <span aria-hidden className="text-4xl lg:hidden">
              🌮
            </span>
            <p className="font-display text-xl tracking-widest text-primary">Taquería ERP</p>
            <h2 className="text-3xl font-semibold">Bienvenido</h2>
            <p className="text-muted-foreground">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <User aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  autoComplete="username"
                  autoFocus
                  placeholder="Tu usuario"
                  className="h-11 pl-9"
                  aria-invalid={!!errors.username}
                  {...register('username')}
                />
              </div>
              {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <LockKeyhole aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 pr-11 pl-9"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 size-9 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" size="lg" className="h-11 text-base" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin" /> Verificando…
                </>
              ) : (
                'Entrar al sistema'
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
