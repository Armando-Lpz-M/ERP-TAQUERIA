import { BookOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { ResponsiveTable, type Column } from '@/components/responsive-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBorrarCategoria, useBorrarProducto, useCategorias, useGuardarProducto, useProductosAdmin } from '@/features/menu/api'
import { CategoriaDialog } from '@/features/menu/categoria-dialog'
import { ProductoDialog } from '@/features/menu/producto-dialog'
import { RecetaDialog } from '@/features/menu/receta-dialog'
import type { Categoria, ProductoAdmin } from '@/features/menu/types'
import { formatMoney } from '@/lib/format'

const TODAS = 'todas'

function ProductosTab() {
  const { data: productos, isPending, isError, refetch } = useProductosAdmin()
  const { data: categorias = [] } = useCategorias()
  const guardar = useGuardarProducto()
  const borrar = useBorrarProducto()

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState(TODAS)
  const [editando, setEditando] = useState<ProductoAdmin | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [receta, setReceta] = useState<ProductoAdmin | null>(null)
  const [aBorrar, setABorrar] = useState<ProductoAdmin | null>(null)

  const texto = busqueda.trim().toLowerCase()
  const visibles = (productos ?? []).filter(
    (p) =>
      (categoria === TODAS || String(p.categoria?.id) === categoria) && (!texto || p.nombre.toLowerCase().includes(texto)),
  )

  const columnas: Column<ProductoAdmin>[] = [
    { key: 'nombre', header: 'Producto', cell: (p) => <span className="font-medium">{p.nombre}</span>, hideOnMobile: true },
    { key: 'categoria', header: 'Categoría', cell: (p) => p.categoria?.nombre ?? <span className="text-muted-foreground">Sin categoría</span> },
    { key: 'precio', header: 'Precio', numeric: true, cell: (p) => <span className="font-medium text-primary">{formatMoney(p.precio)}</span> },
    {
      key: 'receta',
      header: 'Receta',
      cell: (p) =>
        p.receta.length ? (
          `${p.receta.length} ingrediente${p.receta.length === 1 ? '' : 's'}`
        ) : (
          <span className="text-warning">Sin receta</span>
        ),
    },
    {
      key: 'disponible',
      header: 'Disponible',
      cell: (p) => (
        <Switch
          checked={p.disponible}
          aria-label={`${p.nombre} disponible`}
          onCheckedChange={(disponible) =>
            guardar.mutate(
              { id: p.id, disponible },
              {
                onSuccess: () => toast.success(`${p.nombre}: ${disponible ? 'disponible' : 'no disponible'}`),
                onError: (e) => toast.error(e.message),
              },
            )
          }
        />
      ),
    },
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
            placeholder="Buscar producto…"
            aria-label="Buscar producto"
            className="pl-9"
          />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-full @2xl/main:w-48" aria-label="Filtrar por categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setNuevo(true)}>
          <Plus /> Nuevo producto
        </Button>
      </div>

      {isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
          No se pudo cargar el menú.
          <Button variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <ResponsiveTable
          caption="Productos del menú"
          rows={visibles}
          columns={columnas}
          getKey={(p) => p.id}
          title={(p) => (
            <span className="flex items-center gap-2">
              {p.nombre}
              {!p.disponible && <Badge variant="secondary">No disponible</Badge>}
            </span>
          )}
          rowClassName={(p) => (p.disponible ? undefined : 'opacity-60')}
          empty={texto || categoria !== TODAS ? 'Ningún producto coincide con el filtro.' : 'Aún no hay productos. Agrega el primero.'}
          actions={(p) => (
            <>
              <Button variant="ghost" size="sm" onClick={() => setReceta(p)}>
                <BookOpen /> Receta
              </Button>
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

      <ProductoDialog open={nuevo || !!editando} onOpenChange={(o) => !o && (setNuevo(false), setEditando(null))} producto={editando} />
      <RecetaDialog producto={receta} onClose={() => setReceta(null)} />
      <ConfirmDialog
        open={!!aBorrar}
        onOpenChange={(o) => !o && setABorrar(null)}
        title={`¿Eliminar ${aBorrar?.nombre}?`}
        description="Si el producto ya tiene ventas no se podrá eliminar; en ese caso apágalo en “Disponible”."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() =>
          aBorrar &&
          borrar.mutate(aBorrar.id, {
            onSuccess: () => toast.success('Producto eliminado'),
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </div>
  )
}

function CategoriasTab() {
  const { data: categorias, isPending } = useCategorias()
  const borrar = useBorrarCategoria()
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [nueva, setNueva] = useState(false)
  const [aBorrar, setABorrar] = useState<Categoria | null>(null)

  const columnas: Column<Categoria>[] = [
    { key: 'nombre', header: 'Categoría', cell: (c) => <span className="font-medium">{c.nombre}</span>, hideOnMobile: true },
    { key: 'descripcion', header: 'Descripción', cell: (c) => c.descripcion || <span className="text-muted-foreground">—</span> },
    { key: 'productos', header: 'Productos', numeric: true, cell: (c) => c.total_productos ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Button className="self-end" onClick={() => setNueva(true)}>
        <Plus /> Nueva categoría
      </Button>
      {isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <ResponsiveTable
          caption="Categorías"
          rows={categorias ?? []}
          columns={columnas}
          getKey={(c) => c.id}
          title={(c) => c.nombre}
          empty="Aún no hay categorías."
          actions={(c) => (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditando(c)}>
                <Pencil /> Editar
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setABorrar(c)} aria-label={`Eliminar ${c.nombre}`}>
                <Trash2 className="text-destructive" />
              </Button>
            </>
          )}
        />
      )}
      <CategoriaDialog open={nueva || !!editando} onOpenChange={(o) => !o && (setNueva(false), setEditando(null))} categoria={editando} />
      <ConfirmDialog
        open={!!aBorrar}
        onOpenChange={(o) => !o && setABorrar(null)}
        title={`¿Eliminar la categoría ${aBorrar?.nombre}?`}
        description={`Sus ${aBorrar?.total_productos ?? 0} productos dejarán de aparecer al tomar órdenes hasta que los muevas a otra categoría.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() =>
          aBorrar &&
          borrar.mutate(aBorrar.id, {
            onSuccess: () => toast.success('Categoría eliminada'),
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </div>
  )
}

export function MenuPage() {
  return (
    <Tabs defaultValue="productos" className="mx-auto flex max-w-6xl flex-col gap-6">
      <TabsList>
        <TabsTrigger value="productos">Productos</TabsTrigger>
        <TabsTrigger value="categorias">Categorías</TabsTrigger>
      </TabsList>
      <TabsContent value="productos">
        <ProductosTab />
      </TabsContent>
      <TabsContent value="categorias">
        <CategoriasTab />
      </TabsContent>
    </Tabs>
  )
}
