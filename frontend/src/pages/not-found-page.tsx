import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-8xl tracking-widest text-primary">404</p>
      <h2 className="text-xl font-semibold">Esta página no existe</h2>
      <Button asChild variant="secondary">
        <Link to="/">Ir al inicio</Link>
      </Button>
    </div>
  )
}
