import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/api'
import type { PausedSession, SessionActive } from '@shared/types'

export interface SessionApi {
  active: SessionActive | null
  paused: PausedSession | null
  /** Nowa sesja bez zadania — albo, z zadaniem, jak ⇆ (to samo → bez zmian / wznowienie). */
  start: (entryId: number | null) => Promise<void>
  /** Kończy sesję (także wstrzymaną — wtedy tylko chowa widżet, odcinki są już zamknięte). */
  stop: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  /** Przełącza na zadanie; sesja bez zadania (także wstrzymana) zostaje do niego przypięta w całości. */
  switchTo: (entryId: number) => Promise<void>
  /** Skrót: trwa → stop, wstrzymana → wznów, nic → start bez zadania. */
  toggle: () => Promise<void>
  /** Po edycji zadania (tytuł, obszar) — odśwież to, co pokazuje widżet. */
  refresh: () => Promise<void>
}

/**
 * Jedno źródło prawdy o sesji dla całej aplikacji (SessionProvider). Czas i grupy odcinków
 * liczy core, więc hook tylko przechowuje ostatni stan z bazy. Nie tyka co sekundę — licznik
 * liczy widżet — więc konsumenci przerysowują się tylko przy realnej zmianie.
 */
export function useSession(): SessionApi {
  const [active, setActive] = useState<SessionActive | null>(null)
  const [paused, setPaused] = useState<PausedSession | null>(null)
  const busy = useRef(false) // podwójny klik nie może wysłać operacji dwa razy

  useEffect(() => {
    void api.sessions.active().then(setActive)
  }, [])

  const run = useCallback(async (op: () => Promise<void>): Promise<void> => {
    if (busy.current) return
    busy.current = true
    try {
      await op()
    } catch {
      setActive(await api.sessions.active()) // rozjazd z bazą → zsynchronizuj
    } finally {
      busy.current = false
    }
  }, [])

  const running = (s: SessionActive) => {
    setActive(s)
    setPaused(null)
  }

  const switchTo = useCallback(
    (entryId: number) => run(async () => running(await api.sessions.switch(entryId, paused?.groupId))),
    [run, paused]
  )

  const start = useCallback(
    (entryId: number | null) =>
      entryId != null ? switchTo(entryId) : run(async () => running(await api.sessions.start(null))),
    [run, switchTo]
  )

  const stop = useCallback(
    () =>
      run(async () => {
        if (active) await api.sessions.stop()
        setActive(null)
        setPaused(null)
      }),
    [run, active]
  )

  const pause = useCallback(
    () =>
      run(async () => {
        if (!active) return
        setPaused(await api.sessions.pause())
        setActive(null)
      }),
    [run, active]
  )

  const resume = useCallback(
    () =>
      run(async () => {
        if (!paused) return
        running(await api.sessions.resume(paused.groupId))
      }),
    [run, paused]
  )

  const toggle = useCallback(async () => {
    if (active) await stop()
    else if (paused) await resume()
    else await start(null)
  }, [active, paused, stop, resume, start])

  const refresh = useCallback(async () => {
    if (active) setActive(await api.sessions.active())
    else if (paused) setPaused(await api.sessions.group(paused.groupId))
  }, [active, paused])

  return useMemo(
    () => ({ active, paused, start, stop, pause, resume, switchTo, toggle, refresh }),
    [active, paused, start, stop, pause, resume, switchTo, toggle, refresh]
  )
}
