import { Construction } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { NavItem } from '@/lib/navigation'

/** Página temporal para los módulos que se migran en los siguientes pasos. */
export function ComingSoonPage({ item }: { item: NavItem }) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader className="items-center gap-3 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <item.icon className="size-7" aria-hidden />
        </span>
        <CardTitle className="font-display text-3xl tracking-widest">{item.title}</CardTitle>
        <CardDescription className="text-base">{item.description}</CardDescription>
        <p className="mx-auto flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
          <Construction className="size-4 text-warning" aria-hidden />
          Este módulo se está migrando al nuevo frontend
        </p>
      </CardHeader>
    </Card>
  )
}
