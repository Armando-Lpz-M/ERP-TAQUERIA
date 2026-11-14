import { Link } from 'react-router'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { NAV_ITEMS, ROL_LABEL, puedeVer } from '@/lib/navigation'

function saludo() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function DashboardPage() {
  const { user } = useAuth()
  const accesos = NAV_ITEMS.filter((item) => item.path !== '/' && puedeVer(item, user?.rol))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="flex flex-col gap-1">
        <p className="text-muted-foreground">{saludo()},</p>
        <h2 className="text-3xl font-semibold">{user?.nombre}</h2>
        <p className="text-sm text-muted-foreground">
          Entraste como <span className="font-medium text-primary">{user ? ROL_LABEL[user.rol] : ''}</span>
        </p>
      </section>

      <section aria-labelledby="accesos" className="flex flex-col gap-3">
        <h3 id="accesos" className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Accesos rápidos
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accesos.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-secondary">
                <CardHeader className="gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
