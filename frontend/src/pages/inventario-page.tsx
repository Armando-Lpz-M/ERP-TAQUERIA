import { ArrowDownToLine, ArrowUpFromLine, Pencil, Plus, Search, Trash2, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { ResponsiveTable, type Column } from '@/components/responsive-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useBorrarIngrediente,
  useBorrarProveedor,
  useEntradas,
  useIngredientes,
  useProveedores,
  useSalidas,
} from '@/features/inventario/api'
import { IngredienteDialog } from '@/features/inventario/ingrediente-dialog'
import { MovimientoDialog, type TipoMovimiento } from '@/features/inventario/movimiento-dialog'
import { ProveedorDialog } from '@/features/inventario/proveedor-dialog'
import { MOTIVO_LABEL, nivelStock, type Ingrediente, type Proveedor } from '@/features/inventario/types'
import { formatFechaHora, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

const numero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })
const cantidad = (v: string, unidad: string) => `${numero.format(Number(v))} ${unidad}`

function BarraStock({ ingrediente }: { ingrediente: Ingrediente }) {
  const nivel = nivelStock(ingrediente)
  const minimo = Number(ingrediente.stock_minimo)
  // La barra se llena al doble del mínimo
  const pct = minimo > 0 ? Math.min((Number(ingrediente.stock_actual) / (minimo * 2)) * 100, 100) : 100
  return (
    <div className="flex min-w-28 flex-col gap-1">
      <span className="tabular-nums">{cantidad(ingrediente.stock_actual, ingrediente.unidad)}</span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" aria-hidden>
        <div
          className={cn('h-full rounded-full', nivel === 'bajo' ? 'bg-destructive' : nivel === 'atencion' ? 'bg-warning' : 'bg-success')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function EstadoStock({ ingrediente }: { ingrediente: Ingrediente }) {
  const nivel = nivelStock(ingrediente)
  if (nivel === 'bajo')
    return (
      <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
        <TriangleAlert /> Stock bajo
      </Badge>
    )
  if (nivel === 'atencion')
    return (
      <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
        Por agotarse
      </Badge>
    )
  return (
    <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
      Suficiente
    </Badge>
  )
}

function IngredientesTab({ onMovimiento }: { onMovimiento: (tipo: TipoMovimiento, id?: number) => void }) {
  const { data: ingredientes, isPending, isError, refetch } = useIngredientes()
  const borrar = useBorrarIngrediente()
  const [busqueda, setBusqueda] = useState('')
  const [soloBajos, setSoloBajos] = useState(false)
  const [editando, setEditando] = useState<Ingrediente | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [aBorrar, setABorrar] = useState<Ingrediente | null>(null)

  const texto = busqueda.trim().toLowerCase()
  const visibles = (ingredientes ?? [])
    .filter((i) => (!soloBajos || nivelStock(i) !== 'ok') && (!texto || i.nombre.toLowerCase().includes(texto)))
    // Primero lo que se está acabando
    .sort((a, b) => ['bajo', 'atencion', 'ok'].indexOf(nivelStock(a)) - ['bajo', 'atencion', 'ok'].indexOf(nivelStock(b)))

  const columnas: Column<Ingrediente>[] = [
    { key: 'nombre', header: 'Ingrediente', cell: (i) => <span className="font-medium">{i.nombre}</span>, hideOnMobile: true },
    { key: 'stock', header: 'Existencia', cell: (i) => <BarraStock ingrediente={i} /> },
    { key: 'minimo', header: 'Mínimo', cell: (i) => cantidad(i.stock_minimo, i.unidad) },
    { key: 'estado', header: 'Estado', cell: (i) => <EstadoStock ingrediente={i} /> },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 @2xl/main:flex-row @2xl/main:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar ingrediente…"
            aria-label="Buscar ingrediente"
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={soloBajos} onCheckedChange={setSoloBajos} />
          Solo por agotarse
        </label>
        <Button variant="secondary" onClick={() => setNuevo(true)}>
          <Plus /> Nuevo ingrediente
        </Button>
      </div>

      {isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
          No se pudo cargar el inventario.
          <Button variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <ResponsiveTable
          caption="Ingredientes"
          rows={visibles}
          columns={columnas}
          getKey={(i) => i.id}
          title={(i) => i.nombre}
          empty={texto || soloBajos ? 'Nada coincide con el filtro.' : 'Aún no hay ingredientes. Registra el primero.'}
          actions={(i) => (
            <>
              <Button variant="ghost" size="sm" onClick={() => onMovimiento('entrada', i.id)}>
                <ArrowDownToLine /> Entrada
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onMovimiento('salida', i.id)}>
                <ArrowUpFromLine /> Salida
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditando(i)} aria-label={`Editar ${i.nombre}`}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setABorrar(i)} aria-label={`Eliminar ${i.nombre}`}>
                <Trash2 className="text-destructive" />
              </Button>
            </>
          )}
        />
      )}

      <IngredienteDialog open={nuevo || !!editando} onOpenChange={(o) => !o && (setNuevo(false), setEditando(null))} ingrediente={editando} />
      <ConfirmDialog
        open={!!aBorrar}
        onOpenChange={(o) => !o && setABorrar(null)}
        title={`¿Eliminar ${aBorrar?.nombre}?`}
        description="Dejará de aparecer en el inventario y en las recetas nuevas. Su historial de movimientos se conserva."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() =>
          aBorrar &&
          borrar.mutate(aBorrar.id, { onSuccess: () => toast.success('Ingrediente eliminado'), onError: (e) => toast.error(e.message) })
        }
      />
    </div>
  )
}

interface Movimiento {
  key: string
  tipo: 'entrada' | 'salida'
  fecha: string
  ingrediente: Ingrediente
  cantidad: string
  detalle: string
  costo: string | null
}

function MovimientosTab() {
  const entradas = useEntradas()
  const salidas = useSalidas()

  const movimientos = useMemo<Movimiento[]>(() => {
    const e = (entradas.data?.results ?? []).map((m) => ({
      key: `e${m.id}`,
      tipo: 'entrada' as const,
      fecha: m.fecha,
      ingrediente: m.ingrediente,
      cantidad: m.cantidad,
      detalle: [m.proveedor?.nombre, m.notas].filter(Boolean).join(' · ') || 'Compra',
      costo: m.costo_total,
    }))
    const s = (salidas.data?.results ?? []).map((m) => ({
      key: `s${m.id}`,
      tipo: 'salida' as const,
      fecha: m.fecha,
      ingrediente: m.ingrediente,
      cantidad: m.cantidad,
      detalle: [MOTIVO_LABEL[m.motivo], m.notas].filter(Boolean).join(' · '),
      costo: null,
    }))
    return [...e, ...s].sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [entradas.data, salidas.data])

  if (entradas.isPending || salidas.isPending) return <Skeleton className="h-64 rounded-xl" />

  const columnas: Column<Movimiento>[] = [
    { key: 'fecha', header: 'Fecha', cell: (m) => formatFechaHora(m.fecha) },
    { key: 'ingrediente', header: 'Ingrediente', cell: (m) => m.ingrediente.nombre, hideOnMobile: true },
    {
      key: 'cantidad',
      header: 'Cantidad',
      numeric: true,
      cell: (m) => (
        <span className={m.tipo === 'entrada' ? 'text-success' : 'text-destructive'}>
          {m.tipo === 'entrada' ? '+' : '−'}
          {cantidad(m.cantidad, m.ingrediente.unidad)}
        </span>
      ),
    },
    { key: 'detalle', header: 'Detalle', cell: (m) => m.detalle },
    { key: 'costo', header: 'Costo', numeric: true, cell: (m) => (m.costo ? formatMoney(m.costo) : '—'), hideOnMobile: true },
  ]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Últimos movimientos. Los movimientos no se editan ni se borran: si hubo un error, registra un ajuste.
      </p>
      <ResponsiveTable
        caption="Movimientos de inventario"
        rows={movimientos}
        columns={columnas}
        getKey={(m) => m.key}
        title={(m) => (
          <span className="flex items-center gap-2">
            {m.tipo === 'entrada' ? <ArrowDownToLine className="size-4 text-success" /> : <ArrowUpFromLine className="size-4 text-destructive" />}
            {m.ingrediente.nombre}
          </span>
        )}
        empty="Todavía no hay movimientos."
      />
    </div>
  )
}

function ProveedoresTab() {
  const { data: proveedores, isPending } = useProveedores()
  const borrar = useBorrarProveedor()
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [aBorrar, setABorrar] = useState<Proveedor | null>(null)

  const columnas: Column<Proveedor>[] = [
    { key: 'nombre', header: 'Proveedor', cell: (p) => <span className="font-medium">{p.nombre}</span>, hideOnMobile: true },
    { key: 'contacto', header: 'Contacto', cell: (p) => p.contacto || '—' },
    { key: 'telefono', header: 'Teléfono', cell: (p) => p.telefono || '—' },
    { key: 'email', header: 'Correo', cell: (p) => p.email || '—' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Button className="self-end" onClick={() => setNuevo(true)}>
        <Plus /> Nuevo proveedor
      </Button>
      {isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <ResponsiveTable
          caption="Proveedores"
          rows={proveedores ?? []}
          columns={columnas}
          getKey={(p) => p.id}
          title={(p) => p.nombre}
          empty="Aún no hay proveedores."
          actions={(p) => (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditando(p)}>
                <Pencil /> Editar
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setABorrar(p)} aria-label={`Eliminar ${p.nombre}`}>
                <Trash2 className="text-destructive" />
              </Button>
            </>
          )}
        />
      )}
      <ProveedorDialog open={nuevo || !!editando} onOpenChange={(o) => !o && (setNuevo(false), setEditando(null))} proveedor={editando} />
      <ConfirmDialog
        open={!!aBorrar}
        onOpenChange={(o) => !o && setABorrar(null)}
        title={`¿Eliminar a ${aBorrar?.nombre}?`}
        description="Ya no aparecerá al registrar entradas. Las compras pasadas conservan el proveedor."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() =>
          aBorrar && borrar.mutate(aBorrar.id, { onSuccess: () => toast.success('Proveedor eliminado'), onError: (e) => toast.error(e.message) })
        }
      />
    </div>
  )
}

export function InventarioPage() {
  const { data: ingredientes = [] } = useIngredientes()
  const [movimiento, setMovimiento] = useState<{ tipo: TipoMovimiento; id?: number } | null>(null)

  const bajos = ingredientes.filter((i) => nivelStock(i) === 'bajo').length
  const atencion = ingredientes.filter((i) => nivelStock(i) === 'atencion').length

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="grid grid-cols-3 gap-3 lg:grid-cols-4" aria-label="Resumen">
        <Card className="gap-1 py-4">
          <CardHeader className="px-3 sm:px-4">
            <CardDescription>Ingredientes</CardDescription>
            <CardTitle className="font-display text-3xl tracking-wide sm:text-4xl">{ingredientes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={cn('gap-1 py-4', bajos > 0 && 'border-destructive/50')}>
          <CardHeader className="px-3 sm:px-4">
            <CardDescription>Stock bajo</CardDescription>
            <CardTitle className={cn('font-display text-3xl tracking-wide sm:text-4xl', bajos > 0 && 'text-destructive')}>{bajos}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-1 py-4">
          <CardHeader className="px-3 sm:px-4">
            <CardDescription>Por agotarse</CardDescription>
            <CardTitle className={cn('font-display text-3xl tracking-wide sm:text-4xl', atencion > 0 && 'text-warning')}>{atencion}</CardTitle>
          </CardHeader>
        </Card>
        <div className="col-span-3 flex gap-2 lg:col-span-1 lg:flex-col">
          <Button className="h-auto flex-1 py-3" onClick={() => setMovimiento({ tipo: 'entrada' })}>
            <ArrowDownToLine /> Registrar entrada
          </Button>
          <Button variant="secondary" className="h-auto flex-1 py-3" onClick={() => setMovimiento({ tipo: 'salida' })}>
            <ArrowUpFromLine /> Registrar salida
          </Button>
        </div>
      </section>

      <Tabs defaultValue="ingredientes" className="flex flex-col gap-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
        </TabsList>
        <TabsContent value="ingredientes">
          <IngredientesTab onMovimiento={(tipo, id) => setMovimiento({ tipo, id })} />
        </TabsContent>
        <TabsContent value="movimientos">
          <MovimientosTab />
        </TabsContent>
        <TabsContent value="proveedores">
          <ProveedoresTab />
        </TabsContent>
      </Tabs>

      <MovimientoDialog tipo={movimiento?.tipo ?? null} ingredienteId={movimiento?.id} onClose={() => setMovimiento(null)} />
    </div>
  )
}
