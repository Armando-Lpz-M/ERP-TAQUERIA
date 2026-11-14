const LOCALE = 'es-MX'

const moneda = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'MXN' })
const hora = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const fechaHora = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Los montos llegan de Django como texto ("18.00"). */
export function toNumber(value: string | number | null | undefined) {
  const n = typeof value === 'number' ? value : Number.parseFloat(value ?? '')
  return Number.isFinite(n) ? n : 0
}

export const formatMoney = (value: string | number | null | undefined) => moneda.format(toNumber(value))
export const formatHora = (iso: string) => hora.format(new Date(iso))
export const formatFechaHora = (iso: string) => fechaHora.format(new Date(iso))

/** "hace 5 min", "hace 1 h 10 min" */
export function tiempoTranscurrido(iso: string, ahora = Date.now()) {
  const minutos = Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60_000))
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto ? `hace ${horas} h ${resto} min` : `hace ${horas} h`
}
