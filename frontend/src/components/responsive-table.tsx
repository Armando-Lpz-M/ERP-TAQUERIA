import type { ReactNode } from 'react'

import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Alineación a la derecha (montos, cantidades) */
  numeric?: boolean
  className?: string
  /** En celular no se muestra (dato secundario) */
  hideOnMobile?: boolean
}

interface ResponsiveTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  getKey: (row: T) => string | number
  /** Título de cada tarjeta en celular */
  title: (row: T) => ReactNode
  actions?: (row: T) => ReactNode
  rowClassName?: (row: T) => string | undefined
  empty?: ReactNode
  caption?: string
}

/**
 * Con espacio suficiente es una tabla; si el contenedor es angosto (celular, o tablet
 * con el menú lateral abierto) cada fila se vuelve tarjeta. Decide por el ancho del
 * contenedor (container query), no por el de la pantalla.
 */
export function ResponsiveTable<T>({ rows, columns, getKey, title, actions, rowClassName, empty, caption }: ResponsiveTableProps<T>) {
  if (rows.length === 0) {
    return (
      <Card className="items-center p-10 text-center text-muted-foreground">{empty ?? 'Sin registros'}</Card>
    )
  }

  return (
    <div className="@container">
      <Card className="hidden overflow-hidden p-0 @3xl:block">
        <div className="overflow-x-auto">
          <Table>
            {caption && <caption className="sr-only">{caption}</caption>}
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead key={col.key} className={cn('h-11 px-4', col.numeric && 'text-right', col.className)}>
                    {col.header}
                  </TableHead>
                ))}
                {actions && <TableHead className="w-0 px-4"><span className="sr-only">Acciones</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={getKey(row)} className={rowClassName?.(row)}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn('px-4 py-3', col.numeric && 'text-right tabular-nums', col.className)}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="px-4 py-2">
                      <div className="flex justify-end gap-1">{actions(row)}</div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ul className="grid gap-3 @lg:grid-cols-2 @3xl:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={getKey(row)}>
            <Card className={cn('gap-3 p-4', rowClassName?.(row))}>
              <div className="font-medium">{title(row)}</div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((col) => (
                    <div key={col.key} className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{col.header}</dt>
                      <dd className="truncate">{col.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
              {actions && <div className="flex flex-wrap gap-2 border-t border-border pt-3">{actions(row)}</div>}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
