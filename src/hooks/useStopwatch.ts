import { useEffect, useState } from 'react'
import { sessionElapsed } from '@/lib/session'

/** Sekundy na liczniku; tyka co sekundę tylko w komponencie, który go używa. */
export function useStopwatch(startedAt: string | null, carried: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return sessionElapsed(startedAt, carried, new Date(now))
}
