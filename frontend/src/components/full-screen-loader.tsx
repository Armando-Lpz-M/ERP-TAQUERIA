import { LoaderCircle } from 'lucide-react'

export function FullScreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center" role="status" aria-live="polite">
      <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
