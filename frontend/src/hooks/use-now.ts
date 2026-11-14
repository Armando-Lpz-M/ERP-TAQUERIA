import { useEffect, useState } from 'react'

/** Devuelve la hora actual y se actualiza cada `intervalo` ms (para los "hace X min"). */
export function useNow(intervalo = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalo)
    return () => window.clearInterval(id)
  }, [intervalo])
  return now
}
