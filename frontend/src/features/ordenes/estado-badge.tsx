import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { ESTADO_LABEL, type EstadoOrden } from './types'

const ESTILOS: Record<EstadoOrden, string> = {
  abierta: 'border-primary/40 bg-accent text-accent-foreground',
  en_proceso: 'border-info/40 bg-info/15 text-info',
  lista: 'border-success/40 bg-success/15 text-success',
  pagada: 'border-border bg-secondary text-muted-foreground',
  cancelada: 'border-destructive/40 bg-destructive/10 text-destructive',
}

export function EstadoBadge({ estado, className }: { estado: EstadoOrden; className?: string }) {
  return (
    <Badge variant="outline" className={cn(ESTILOS[estado], className)}>
      {ESTADO_LABEL[estado]}
    </Badge>
  )
}
