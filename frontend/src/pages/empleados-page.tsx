import { Clock, KeyRound, LogIn, LogOut, MoreVertical, Pencil, Phone, Plus, Search, UserCheck, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { ResponsiveTable, type Column } from '@/components/responsive-table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAuth } from '@/features/auth/auth-context'
import { AccesoDialog } from '@/features/empleados/acceso-dialog'
import { useDarDeBaja, useEmpleados, useGuardarEmpleado, useTurnoReloj, useTurnos } from '@/features/empleados/api'
import { EmpleadoDialog } from '@/features/empleados/empleado-dialog'
import { formatHoras, ROL_EMPLEADO_LABEL, type Empleado, type Turno } from '@/features/empleados/types'
import { useNow } from '@/hooks/use-now'
import { formatHora } from '@/lib/format'
import { cn } from '@/lib/utils'

type FiltroEstado = 'activos' | 'inactivos' | 'todos'

function iniciales(e: Empleado) {
  return `${e.nombre.charAt(0)}${e.apellido.charAt(0)}`.toUpperCase()
}

function EmpleadoCard({
  empleado,
  ahora,
  esYo,
  onEditar,
  onAcceso,
  onBaja,
}: {
  empleado: Empleado
  ahora: number
  esYo: boolean
  onEditar: () => void
  onAcceso: () => void
  onBaja: () => void
}) {
  const reloj = useTurnoReloj()
  const guardar = useGuardarEmpleado()
  const enTurno = !!empleado.turno_activo
  const nombre = `${empleado.nombre} ${empleado.apellido}`

  const marcar = (accion: 'entrada' | 'salida') =>
    reloj.mutate(
      { id: empleado.id, accion },
      {
        onSuccess: (t) =>
          toast.success(
            accion === 'entrada'
              ? `${empleado.nombre} entró a las ${formatHora(t.entrada)}`
              : `${empleado.nombre} salió · ${formatHoras(t.horas_trabajadas ?? 0)}`,
          ),
        onError: (e) => toast.error(e.message),
      },
    )

  return (
    <Card className={cn('gap-4', !empleado.activo && 'opacity-60')}>
      <CardHeader className="flex flex-row items-start gap-3">
        <Avatar className="size-11 rounded-xl">
          <AvatarFallback className="rounded-xl bg-accent font-semibold text-accent-foreground">{iniciales(empleado)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate">{nombre}</CardTitle>
          <CardDescription>{ROL_EMPLEADO_LABEL[empleado.rol]}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Opciones de ${nombre}`}>
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEditar}>
              <Pencil /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onAcceso}>
              <KeyRound /> {empleado.tiene_acceso ? 'Cambiar contraseña' : 'Dar acceso'}
            </DropdownMenuItem>
            {!esYo && (
              <>
                <DropdownMenuSeparator />
                {empleado.activo ? (
                  <DropdownMenuItem variant="destructive" onSelect={onBaja}>
                    <UserX /> Dar de baja
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={() =>
                      guardar.mutate(
                        { id: empleado.id, activo: true },
                        { onSuccess: () => toast.success(`${nombre} reactivado`), onError: (e) => toast.error(e.message) },
                      )
                    }
                  >
                    <UserCheck /> Reactivar
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-2 text-sm">
        {!empleado.activo ? (
          <Badge variant="secondary">Inactivo</Badge>
        ) : enTurno ? (
          <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
            <Clock /> En turno · {formatHoras((ahora - new Date(empleado.turno_activo!).getTime()) / 3_600_000)}
          </Badge>
        ) : (
          <Badge variant="outline">Fuera de turno</Badge>
        )}
        {empleado.tiene_acceso ? (
          <Badge variant="outline" className="font-mono">
            @{empleado.usuario_username}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-warning/40 text-warning">
            Sin acceso
          </Badge>
        )}
        {empleado.telefono && (
          <a href={`tel:${empleado.telefono}`} className="-my-1 inline-flex min-h-8 items-center gap-1 rounded-md px-1 text-muted-foreground hover:text-foreground">
            <Phone className="size-3.5" aria-hidden /> {empleado.telefono}
          </a>
        )}
      </CardContent>

      {empleado.activo && (
        <CardFooter>
          {enTurno ? (
            <Button variant="secondary" className="w-full" disabled={reloj.isPending} onClick={() => marcar('salida')}>
              <LogOut /> Registrar salida
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled={reloj.isPending} onClick={() => marcar('entrada')}>
              <LogIn /> Registrar entrada
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

function PersonalTab() {
  const { user } = useAuth()
  const ahora = useNow(60_000)
  const { data: empleados, isPending, isError, refetch } = useEmpleados()
  const baja = useDarDeBaja()
  const [filtro, setFiltro] = useState<FiltroEstado>('activos')
  const [busqueda, setBusqueda] = useState('')
  const [nuevo, setNuevo] = useState(false)
  const [editando, setEditando] = useState<Empleado | null>(null)
  const [acceso, setAcceso] = useState<Empleado | null>(null)
  const [aBaja, setABaja] = useState<Empleado | null>(null)

  const texto = busqueda.trim().toLowerCase()
  const visibles = (empleados ?? []).filter(
    (e) =>
      (filtro === 'todos' || (filtro === 'activos' ? e.activo : !e.activo)) &&
      (!texto || `${e.nombre} ${e.apellido}`.toLowerCase().includes(texto)),
  )
  const enTurno = (empleados ?? []).filter((e) => e.activo && e.turno_activo).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 @2xl/main:flex-row @2xl/main:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar empleado…"
            aria-label="Buscar empleado"
            className="pl-9"
          />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={filtro}
          onValueChange={(v) => v && setFiltro(v as FiltroEstado)}
          aria-label="Estado"
          className="grid grid-cols-3"
        >
          <ToggleGroupItem value="activos">Activos</ToggleGroupItem>
          <ToggleGroupItem value="inactivos">Inactivos</ToggleGroupItem>
          <ToggleGroupItem value="todos">Todos</ToggleGroupItem>
        </ToggleGroup>
        <Button onClick={() => setNuevo(true)}>
          <Plus /> Nuevo empleado
        </Button>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {enTurno === 0 ? 'Nadie en turno ahora.' : `${enTurno} ${enTurno === 1 ? 'persona' : 'personas'} en turno ahora.`}
      </p>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
          No se pudieron cargar los empleados.
          <Button variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : visibles.length === 0 ? (
        <Card className="items-center p-10 text-center text-muted-foreground">
          {texto ? 'Nadie coincide con la búsqueda.' : filtro === 'inactivos' ? 'No hay empleados dados de baja.' : 'Aún no hay empleados.'}
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Empleados">
          {visibles.map((e) => (
            <li key={e.id}>
              <EmpleadoCard
                empleado={e}
                ahora={ahora}
                esYo={e.usuario_username === user?.username}
                onEditar={() => setEditando(e)}
                onAcceso={() => setAcceso(e)}
                onBaja={() => setABaja(e)}
              />
            </li>
          ))}
        </ul>
      )}

      <EmpleadoDialog open={nuevo || !!editando} onOpenChange={(o) => !o && (setNuevo(false), setEditando(null))} empleado={editando} />
      <AccesoDialog empleado={acceso} onClose={() => setAcceso(null)} />
      <ConfirmDialog
        open={!!aBaja}
        onOpenChange={(o) => !o && setABaja(null)}
        title={`¿Dar de baja a ${aBaja?.nombre} ${aBaja?.apellido}?`}
        description="Ya no podrá iniciar sesión y, si está en turno, se le registrará la salida. Sus turnos y órdenes se conservan y puedes reactivarlo después."
        confirmLabel="Dar de baja"
        destructive
        onConfirm={() =>
          aBaja && baja.mutate(aBaja.id, { onSuccess: () => toast.success('Empleado dado de baja'), onError: (e) => toast.error(e.message) })
        }
      />
    </div>
  )
}

type Rango = 'hoy' | 'semana' | 'mes'
const TODOS = 'todos'
const fechaISO = (d: Date) => d.toLocaleDateString('en-CA') // AAAA-MM-DD en hora local

function horasTurno(t: Turno, ahora: number) {
  return t.horas_trabajadas ?? (ahora - new Date(t.entrada).getTime()) / 3_600_000
}

function rangoFechas(rango: Rango) {
  const hoy = new Date()
  const desde = new Date(hoy)
  if (rango === 'semana') desde.setDate(hoy.getDate() - 6)
  if (rango === 'mes') desde.setDate(1)
  return { desde: fechaISO(desde), hasta: fechaISO(hoy) }
}

function TurnosTab() {
  const ahora = useNow(60_000)
  const { data: empleados = [] } = useEmpleados()
  const [rango, setRango] = useState<Rango>('semana')
  const [empleado, setEmpleado] = useState(TODOS)
  const filtro = { ...rangoFechas(rango), ...(empleado !== TODOS ? { empleado: Number(empleado) } : {}) }
  const { data: turnos, isPending } = useTurnos(filtro)

  // Un turno en curso cuenta hasta este momento
  const horasDe = (t: Turno) => horasTurno(t, ahora)

  const resumen = useMemo(() => {
    const porEmpleado = new Map<number, { nombre: string; horas: number; turnos: number }>()
    for (const t of turnos ?? []) {
      const r = porEmpleado.get(t.empleado.id) ?? { nombre: `${t.empleado.nombre} ${t.empleado.apellido}`, horas: 0, turnos: 0 }
      r.horas += horasTurno(t, ahora)
      r.turnos += 1
      porEmpleado.set(t.empleado.id, r)
    }
    return [...porEmpleado.values()].sort((a, b) => b.horas - a.horas)
  }, [turnos, ahora])

  const columnas: Column<Turno>[] = [
    { key: 'empleado', header: 'Empleado', cell: (t) => `${t.empleado.nombre} ${t.empleado.apellido}`, hideOnMobile: true },
    {
      key: 'fecha',
      header: 'Fecha',
      cell: (t) => new Date(t.entrada).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }),
    },
    { key: 'entrada', header: 'Entrada', cell: (t) => formatHora(t.entrada) },
    {
      key: 'salida',
      header: 'Salida',
      cell: (t) => (t.salida ? formatHora(t.salida) : <span className="text-success">En curso</span>),
    },
    { key: 'horas', header: 'Horas', numeric: true, cell: (t) => formatHoras(horasDe(t)) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 @2xl/main:flex-row @2xl/main:items-center">
        <ToggleGroup
          type="single"
          variant="outline"
          value={rango}
          onValueChange={(v) => v && setRango(v as Rango)}
          aria-label="Periodo"
          className="grid grid-cols-3"
        >
          <ToggleGroupItem value="hoy">Hoy</ToggleGroupItem>
          <ToggleGroupItem value="semana">7 días</ToggleGroupItem>
          <ToggleGroupItem value="mes">Este mes</ToggleGroupItem>
        </ToggleGroup>
        <Select value={empleado} onValueChange={setEmpleado}>
          <SelectTrigger className="w-full @2xl/main:w-60" aria-label="Empleado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los empleados</SelectItem>
            {empleados.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.nombre} {e.apellido}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {resumen.length > 0 && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" aria-label="Horas por empleado">
          {resumen.map((r) => (
            <Card key={r.nombre} className="gap-1 py-4">
              <CardHeader className="px-4">
                <CardDescription className="truncate">{r.nombre}</CardDescription>
                <CardTitle className="font-display text-3xl tracking-wide text-primary">{formatHoras(r.horas)}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {r.turnos} {r.turnos === 1 ? 'turno' : 'turnos'}
                </p>
              </CardHeader>
            </Card>
          ))}
        </section>
      )}

      {isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <ResponsiveTable
          caption="Turnos"
          rows={turnos ?? []}
          columns={columnas}
          getKey={(t) => t.id}
          title={(t) => `${t.empleado.nombre} ${t.empleado.apellido}`}
          empty="No hay turnos en este periodo."
        />
      )}
    </div>
  )
}

export function EmpleadosPage() {
  return (
    <Tabs defaultValue="personal" className="mx-auto flex max-w-6xl flex-col gap-6">
      <TabsList>
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="turnos">Turnos</TabsTrigger>
      </TabsList>
      <TabsContent value="personal">
        <PersonalTab />
      </TabsContent>
      <TabsContent value="turnos">
        <TurnosTab />
      </TabsContent>
    </Tabs>
  )
}
