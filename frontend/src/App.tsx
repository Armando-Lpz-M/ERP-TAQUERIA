import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Pantalla temporal para revisar el tema (paso 2).
 * En el paso 3 se reemplaza por el login, el layout con sidebar y las rutas.
 */
export default function App() {
  return (
    <main className="min-h-svh px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-5xl tracking-wide text-primary sm:text-6xl">
            Taquería ERP
          </h1>
          <p className="text-muted-foreground">
            Nuevo frontend con React + Vite + TypeScript + Tailwind + shadcn/ui
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Ventas de hoy', value: '$4,820.00', tone: 'text-primary' },
            { label: 'Órdenes abiertas', value: '7', tone: 'text-info' },
            { label: 'Stock bajo', value: '3', tone: 'text-destructive' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className={`font-display text-4xl tracking-wide ${stat.tone}`}>
                  {stat.value}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Componentes</CardTitle>
            <CardDescription>Botones, estados y formulario con la paleta de la taquería</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <Badge>Abierta</Badge>
              <Badge variant="secondary">En cocina</Badge>
              <Badge className="bg-success text-success-foreground">Pagada</Badge>
              <Badge variant="destructive">Cancelada</Badge>
              <Badge variant="outline">Mesa 4</Badge>
            </div>
            <div className="grid gap-2 sm:max-w-sm">
              <Label htmlFor="cliente">Cliente o mesa</Label>
              <Input id="cliente" placeholder="Ej. Mesa 4" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button onClick={() => toast.success('Orden creada')}>Crear orden</Button>
            <Button variant="secondary" onClick={() => toast.info('Enviada a cocina')}>
              Enviar a cocina
            </Button>
            <Button variant="outline">Ver ticket</Button>
            <Button variant="destructive" onClick={() => toast.error('Orden cancelada')}>
              Cancelar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
