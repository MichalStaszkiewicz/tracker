import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api'
import { secondsSince } from '@/lib/format'
import type { SessionActive } from '@shared/types'

export function useActiveSession() {
  const [active, setActive] = useState<SessionActive | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const refetch = useCallback(async () => {
    setActive(await api.sessions.active())
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  // Tyka co sekundę, gdy sesja trwa.
  useEffect(() => {
    if (!active) {
      setElapsed(0)
      return
    }
    const tick = () => setElapsed(secondsSince(active.startedAt))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [active])

  const stop = useCallback(async () => {
    await api.sessions.stop()
    await refetch()
  }, [refetch])

  const start = useCallback(
    async (entryId: number | null = null) => {
      await api.sessions.start(entryId)
      await refetch()
    },
    [refetch]
  )

  const toggle = useCallback(async () => {
    if (active) await stop()
    else await start(null)
  }, [active, stop, start])

  return { active, elapsed, stop, start, toggle, refetch }
}
