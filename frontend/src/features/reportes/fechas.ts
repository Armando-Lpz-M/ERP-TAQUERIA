/** AAAA-MM-DD en hora local */
export const fechaISO = (d: Date) => d.toLocaleDateString('en-CA')

export function hoyISO() {
  return fechaISO(new Date())
}

export type Preset = 'hoy' | '7d' | '30d' | 'mes'

export function rangoPreset(preset: Preset) {
  const hoy = new Date()
  const desde = new Date(hoy)
  if (preset === '7d') desde.setDate(hoy.getDate() - 6)
  if (preset === '30d') desde.setDate(hoy.getDate() - 29)
  if (preset === 'mes') desde.setDate(1)
  return { desde: fechaISO(desde), hasta: fechaISO(hoy) }
}

/** "2026-11-14" → "14 nov" (sin desfase de zona horaria) */
export function fechaCorta(iso: string, conDia = false) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    ...(conDia ? { weekday: 'short' as const } : {}),
    day: 'numeric',
    month: 'short',
  })
}
