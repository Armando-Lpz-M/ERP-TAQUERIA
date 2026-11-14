import { ArrowRight, ChefHat, Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/auth-context'
import type { Rol } from '@/features/auth/types'
import { usePendientesCocina } from '@/features/cocina/api'
import { useIngredientes } from '@/features/inventario/api'
import { nivelStock } from '@/features/inventario/types'
import { useOrdenesActivas } from '@/features/ordenes/api'
import { EstadoBadge } from '@/features/ordenes/estado-badge'
import { NuevaOrdenDialog } from '@/features/ordenes/nueva-orden-dialog'
import { useResumen } from '@/features/reportes/api'
import { hoyISO } from '@/features/reportes/fechas'
import { TopProductos } from '@/features/reportes/graficas-html'
import { formatMoney, tiempoTranscurrido } from '@/lib/format'
import { NAV_ITEMS, ROL_LABEL, puedeVer } from '@/lib/navigation'

function saludo() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const ve = (rol: Rol | undefined, ...roles: Rol[]) => !!rol && roles.includes(rol)

function Tile({ label, valor, destacado, cargando }: { label: string; valor: string; destacado?: boolean; cargando?: boolean }) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4">
        <CardDescription>{label}</CardDescription>
        {cargando ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <CardTitle className={destacado ? 'text-3xl font-semibold text-primary sm:text-4xl' : 'text-2xl font-semibold sm:text-3xl'}>{valor}</CardTitle>
        )}
      </CardHeader>
    </Card>
  )
}

function VentasDeHoy() {
  const hoy = hoyISO()
  const { data: r, isPending } = useResumen({ desde: hoy, hasta: hoy })
  const { data: activas } = useOrdenesActivas()
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Hoy">
      <Tile label="Ventas de hoy" valor={formatMoney(r?.total_ventas)} destacado cargando={isPending} />
      <Tile label="Órdenes cobradas" valor={String(r?.total_ordenes ?? 0)} cargando={isPending} />
      <Tile label="Ticket promedio" valor={formatMoney(r?.ticket_promedio)} cargando={isPending} />
      <Tile label="Órdenes activas" valor={String(activas?.length ?? 0)} cargando={!activas} />
    </section>
  )
}

function OrdenesActivas({ esMesero }: { esMesero: boolean }) {
  const { data: ordenes, isPending } = useOrdenesActivas()
  const [nueva, setNueva] = useState(false)
  const lista = (ordenes ?? []).slice(0, 6)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>{esMesero ? 'Mis órdenes activas' : 'Órdenes activas'}</CardTitle>
          <CardDescription>Sin cobrar todavía</CardDescription>
        </div>
        <Button size="sm" onClick={() => setNueva(true)}>
          <Plus /> Nueva
        </Button>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-32" />
        ) : lista.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No hay órdenes activas.</p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {lista.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/ordenes/${o.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{o.referencia}</span>
                    <span className="block text-xs text-muted-foreground">{tiempoTranscurrido(o.creada)}</span>
                  </span>
                  <EstadoBadge estado={o.estado} />
                  <span className="w-20 text-right font-medium tabular-nums">{formatMoney(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(ordenes?.length ?? 0) > lista.length && (
          <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
            <Link to="/ordenes">
              Ver las {ordenes?.length} órdenes <ArrowRight />
            </Link>
          </Button>
        )}
      </CardContent>
      <NuevaOrdenDialog open={nueva} onOpenChange={setNueva} />
    </Card>
  )
}

function MasVendidosHoy() {
  const hoy = hoyISO()
  const { data: r, isPending } = useResumen({ desde: hoy, hasta: hoy })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lo más vendido hoy</CardTitle>
        <CardDescription>Por piezas</CardDescription>
      </CardHeader>
      <CardContent>{isPending ? <Skeleton className="h-32" /> : <TopProductos datos={r?.top_productos ?? []} limite={5} />}</CardContent>
    </Card>
  )
}

function AlertaStock() {
  const { data: ingredientes } = useIngredientes()
  const bajos = (ingredientes ?? []).filter((i) => nivelStock(i) === 'bajo')
  if (bajos.length === 0) return null
  return (
    <Card className="border-destructive/50">
      <CardHeader className="flex flex-row items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1">
          <CardTitle>Stock bajo</CardTitle>
          <CardDescription className="truncate">{bajos.map((i) => i.nombre).join(', ')}</CardDescription>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/inventario">Ver inventario</Link>
        </Button>
      </CardHeader>
    </Card>
  )
}

function PedidosCocina() {
  const { data: pedidos, isPending } = usePendientesCocina()
  const nuevos = (pedidos ?? []).filter((p) => p.estado === 'abierta').length
  const enProceso = (pedidos ?? []).filter((p) => p.estado === 'en_proceso').length
  return (
    <section className="grid grid-cols-2 gap-3" aria-label="Cocina">
      <Tile label="Pedidos nuevos" valor={String(nuevos)} destacado cargando={isPending} />
      <Tile label="En preparación" valor={String(enProceso)} cargando={isPending} />
      <Button asChild size="lg" className="col-span-2 h-14 text-base">
        <Link to="/cocina">
          <ChefHat /> Ir a cocina
        </Link>
      </Button>
    </section>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const rol = user?.rol
  const accesos = NAV_ITEMS.filter((item) => item.path !== '/' && puedeVer(item, rol))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="flex flex-col gap-1">
        <p className="text-muted-foreground">{saludo()},</p>
        <h2 className="text-3xl font-semibold">{user?.nombre}</h2>
        <p className="text-sm text-muted-foreground">
          Entraste como <span className="font-medium text-primary">{rol ? ROL_LABEL[rol] : ''}</span>
        </p>
      </section>

      {ve(rol, 'admin') && <AlertaStock />}
      {ve(rol, 'admin', 'cajero') && <VentasDeHoy />}
      {ve(rol, 'cocina') && <PedidosCocina />}

      {ve(rol, 'admin', 'cajero', 'mesero') && (
        <div className="grid gap-6 lg:grid-cols-2">
          <OrdenesActivas esMesero={rol === 'mesero'} />
          {ve(rol, 'admin', 'cajero') && <MasVendidosHoy />}
        </div>
      )}

      <section aria-labelledby="accesos" className="flex flex-col gap-3">
        <h3 id="accesos" className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Accesos rápidos
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accesos.map((item) => (
            <Link key={item.path} to={item.path} className="min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full flex-row items-center gap-3 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <item.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
