import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Textarea } from '@/components/ui/textarea'
import { formatMoney } from '@/lib/format'
import { aplicarErroresServidor, decimal, decimalPositivo } from '@/lib/forms'

import { useIngredientes, useProveedores, useRegistrarEntrada, useRegistrarSalida } from './api'

export type TipoMovimiento = 'entrada' | 'salida'

const SIN_PROVEEDOR = 'ninguno'

const schema = z.object({
  ingrediente_id: z.string().min(1, 'Elige un ingrediente'),
  cantidad: decimalPositivo('Escribe una cantidad válida'),
  costo_unitario: decimal('Escribe un costo válido'),
  proveedor_id: z.string(),
  motivo: z.enum(['merma', 'ajuste']),
  notas: z.string().max(500),
})
type Form = z.infer<typeof schema>

interface Props {
  tipo: TipoMovimiento | null
  ingredienteId?: number
  onClose: () => void
}

export function MovimientoDialog({ tipo, ingredienteId, onClose }: Props) {
  return (
    <Dialog open={!!tipo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        {tipo && <MovimientoForm key={`${tipo}-${ingredienteId}`} tipo={tipo} ingredienteId={ingredienteId} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function MovimientoForm({ tipo, ingredienteId, onDone }: { tipo: TipoMovimiento; ingredienteId?: number; onDone: () => void }) {
  const { data: ingredientes = [] } = useIngredientes()
  const { data: proveedores = [] } = useProveedores()
  const entrada = useRegistrarEntrada()
  const salida = useRegistrarSalida()
  const esEntrada = tipo === 'entrada'
  const guardando = entrada.isPending || salida.isPending

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      ingrediente_id: ingredienteId ? String(ingredienteId) : '',
      cantidad: '',
      costo_unitario: '0',
      proveedor_id: SIN_PROVEEDOR,
      motivo: 'merma',
      notas: '',
    },
  })
  const [ingId, cantidad, costo] = useWatch({ control, name: ['ingrediente_id', 'cantidad', 'costo_unitario'] })
  const ingrediente = ingredientes.find((i) => String(i.id) === ingId)
  const costoTotal = Number(cantidad) * Number(costo)

  const campos = ['ingrediente_id', 'cantidad', 'costo_unitario', 'proveedor_id', 'motivo', 'notas'] as const
  const onError = (err: Error) => aplicarErroresServidor(err, setError, campos)
  const onSuccess = () => {
    toast.success(esEntrada ? 'Entrada registrada' : 'Salida registrada')
    onDone()
  }

  const onSubmit = handleSubmit((f) => {
    if (esEntrada) {
      entrada.mutate(
        {
          ingrediente_id: Number(f.ingrediente_id),
          cantidad: f.cantidad,
          costo_unitario: f.costo_unitario || '0',
          proveedor_id: f.proveedor_id === SIN_PROVEEDOR ? null : Number(f.proveedor_id),
          notas: f.notas,
        },
        { onSuccess, onError },
      )
    } else {
      if (ingrediente && Number(f.cantidad) > Number(ingrediente.stock_actual)) {
        setError('cantidad', { message: `Solo hay ${Number(ingrediente.stock_actual)} ${ingrediente.unidad}` })
        return
      }
      salida.mutate(
        { ingrediente_id: Number(f.ingrediente_id), cantidad: f.cantidad, motivo: f.motivo, notas: f.notas },
        { onSuccess, onError },
      )
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{esEntrada ? 'Registrar entrada' : 'Registrar salida'}</DialogTitle>
        <DialogDescription>
          {esEntrada ? 'Compras o mercancía que llega al negocio.' : 'Mermas o ajustes de inventario. Las ventas se descuentan solas.'}
        </DialogDescription>
      </DialogHeader>

      <FormField
        id="mov-ing"
        label="Ingrediente"
        error={errors.ingrediente_id?.message}
        hint={ingrediente ? `En existencia: ${Number(ingrediente.stock_actual)} ${ingrediente.unidad}` : undefined}
      >
        <Controller
          control={control}
          name="ingrediente_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="mov-ing" className="w-full" aria-invalid={!!errors.ingrediente_id}>
                <SelectValue placeholder="Elige…" />
              </SelectTrigger>
              <SelectContent>
                {ingredientes.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.nombre} ({i.unidad})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="mov-cant" label={`Cantidad${ingrediente ? ` (${ingrediente.unidad})` : ''}`} error={errors.cantidad?.message}>
          <Input id="mov-cant" inputMode="decimal" autoFocus={!!ingredienteId} aria-invalid={!!errors.cantidad} {...register('cantidad')} />
        </FormField>
        {esEntrada && (
          <FormField id="mov-costo" label="Costo por unidad" error={errors.costo_unitario?.message}>
            <Input id="mov-costo" inputMode="decimal" aria-invalid={!!errors.costo_unitario} {...register('costo_unitario')} />
          </FormField>
        )}
      </div>

      {esEntrada ? (
        <>
          <FormField id="mov-prov" label="Proveedor (opcional)" error={errors.proveedor_id?.message}>
            <Controller
              control={control}
              name="proveedor_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="mov-prov" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_PROVEEDOR}>Sin proveedor</SelectItem>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {costoTotal > 0 && (
            <p className="flex justify-between rounded-lg bg-secondary px-4 py-3 text-sm">
              <span className="text-muted-foreground">Costo total</span>
              <span className="font-semibold">{formatMoney(costoTotal)}</span>
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <span id="motivo-label" className="text-sm font-medium">
            Motivo
          </span>
          <Controller
            control={control}
            name="motivo"
            render={({ field }) => (
              <ToggleGroup
                type="single"
                variant="outline"
                value={field.value}
                onValueChange={(v) => v && field.onChange(v)}
                aria-labelledby="motivo-label"
                className="grid w-full grid-cols-2"
              >
                <ToggleGroupItem value="merma" className="data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
                  Merma
                </ToggleGroupItem>
                <ToggleGroupItem value="ajuste" className="data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
                  Ajuste
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          />
        </div>
      )}

      <FormField id="mov-notas" label="Notas (opcional)" error={errors.notas?.message}>
        <Textarea id="mov-notas" rows={2} placeholder={esEntrada ? 'Ej. factura 1234' : 'Ej. se quemó, caducó…'} {...register('notas')} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant={esEntrada ? 'default' : 'destructive'} disabled={guardando}>
          {guardando && <LoaderCircle className="animate-spin" />}
          {esEntrada ? 'Registrar entrada' : 'Registrar salida'}
        </Button>
      </DialogFooter>
    </form>
  )
}
