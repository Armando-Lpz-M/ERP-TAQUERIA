import { ShieldX } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 text-center">
      <ShieldX className="size-12 text-destructive" aria-hidden />
      <h2 className="font-display text-4xl tracking-widest">Sin permiso</h2>
      <p className="max-w-sm text-muted-foreground">Tu rol no tiene acceso a esta sección. Si crees que es un error, habla con el administrador.</p>
      <Button asChild variant="secondary">
        <Link to="/">Ir al inicio</Link>
      </Button>
    </div>
  )
}
