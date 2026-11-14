import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useMenu } from './api'
import type { ItemOrden, ProductoMenu } from './types'

const TODAS = '__todas__'

interface MenuPanelProps {
  items: ItemOrden[]
  disabled?: boolean
  onAgregar: (producto: ProductoMenu) => void
}

export function MenuPanel({ items, disabled, onAgregar }: MenuPanelProps) {
  const { data: menu, isPending, isError, refetch } = useMenu()
  const [categoria, setCategoria] = useState(TODAS)
  const [busqueda, setBusqueda] = useState('')

  // Cuántas piezas de cada producto lleva la orden (para mostrarlo en el botón)
  const enOrden = useMemo(() => {
    const m = new Map<number, number>()
    for (const item of items) {
      if (item.producto) m.set(item.producto.id, (m.get(item.producto.id) ?? 0) + item.cantidad)
    }
    return m
  }, [items])

  const texto = busqueda.trim().toLowerCase()
  const secciones = (menu ?? [])
    .filter((c) => categoria === TODAS || c.categoria === categoria)
    .map((c) => ({
      ...c,
      productos: c.productos.filter((p) => p.disponible && (!texto || p.nombre.toLowerCase().includes(texto))),
    }))
    .filter((c) => c.productos.length > 0)

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
        No se pudo cargar el menú.
        <Button variant="secondary" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto…"
          aria-label="Buscar producto"
          className="h-11 pl-9"
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Categorías">
        {[TODAS, ...(menu ?? []).map((c) => c.categoria)].map((nombre) => (
          <Button
            key={nombre}
            role="tab"
            aria-selected={categoria === nombre}
            variant={categoria === nombre ? 'default' : 'secondary'}
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => setCategoria(nombre)}
          >
            {nombre === TODAS ? 'Todo' : nombre}
          </Button>
        ))}
      </div>

      {secciones.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          {texto ? `Sin resultados para “${busqueda}”` : 'No hay productos disponibles en el menú.'}
        </p>
      ) : (
        secciones.map((seccion) => (
          <section key={seccion.categoria} className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{seccion.categoria}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {seccion.productos.map((producto) => {
                const cantidad = enOrden.get(producto.id) ?? 0
                return (
                  <button
                    key={producto.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onAgregar(producto)}
                    className={cn(
                      'relative flex min-h-24 flex-col justify-between gap-2 rounded-xl border bg-card p-3 text-left transition-colors',
                      'hover:border-primary/50 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98]',
                      'disabled:pointer-events-none disabled:opacity-50',
                      cantidad > 0 && 'border-primary/50',
                    )}
                  >
                    <span className="pr-7 font-medium leading-tight">{producto.nombre}</span>
                    <span className="font-display text-xl tracking-wide text-primary">{formatMoney(producto.precio)}</span>
                    {cantidad > 0 && (
                      <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
                        {cantidad}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
