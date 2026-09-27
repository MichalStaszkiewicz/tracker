import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/api'
import { secondsSince } from '@/lib/format'
import type { SessionActive } from '@shared/types'

/** Wstrzymana sesja: odcinek zamknięty w bazie, widżet pamięta zadanie do wznowienia. */
export interface PausedSession {
  entryId: number | null
  entryTitle: string | null
  areaColor: string | null
}

export interface SessionApi {
  active: SessionActive | null
  paused: PausedSession | null
  /** Sekundy z odcinków sprzed pauzy (licznik = carried + bieżący odcinek). */
  carried: number
  start: (entryId: number | null) => Promise<void>
  /** Kończy sesję (także wstrzymaną — wtedy tylko chowa widżet). */
  stop: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  /** Przełącza na inne zadanie (bez zadania: przypina bieżący odcinek). */
  switchTo: (entryId: number) => Promise<void>
  /** Skrót: trwa → stop, wstrzymana → wznów, nic → start bez zadania. */
  toggle: () => Promise<void>
}

/**
 * Jedno źródło prawdy o sesji dla całej aplikacji (SessionProvider). Nie tyka co sekundę —
 * licznik liczy widżet — więc konsumenci przerysowują się tylko przy realnej zmianie stanu.
 */
export function useSession(): SessionApi {
  const [active, setActive] = useState<SessionActive | null>(null)
  const [paused, setPaused] = useState<PausedSession | null>(null)
  const [carried, setCarried] = useState(0)
  const busy = useRef(false) // podwójny klik „pauza" nie może dodać odcinka dwa razy

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

  const start = useCallback(
    (entryId: number | null) =>
      run(async () => {
        const s = await api.sessions.start(entryId)
        setActive(s)
        setPaused(null)
        setCarried(0)
      }),
    [run]
  )

  const stop = useCallback(
    () =>
      run(async () => {
        if (active) await api.sessions.stop()
        setActive(null)
        setPaused(null)
        setCarried(0)
      }),
    [run, active]
  )

  const pause = useCallback(
    () =>
      run(async () => {
        if (!active) return
        const segment = secondsSince(active.startedAt)
        await api.sessions.stop()
        setCarried((c) => c + segment)
        setPaused({ entryId: active.entryId, entryTitle: active.entryTitle, areaColor: active.areaColor })
        setActive(null)
      }),
    [run, active]
  )

  const resume = useCallback(
    () =>
      run(async () => {
        if (!paused) return
        setActive(await api.sessions.start(paused.entryId))
        setPaused(null)
      }),
    [run, paused]
  )

  const switchTo = useCallback(
    (entryId: number) =>
      run(async () => {
        const previousId = active?.id ?? null
        const s = await api.sessions.switch(entryId)
        // Ten sam odcinek (przypięty do zadania) liczy dalej; nowy odcinek = nowe zadanie → od zera.
        if (s.id !== previousId) setCarried(0)
        setActive(s)
        setPaused(null)
      }),
    [run, active]
  )

  const toggle = useCallback(async () => {
    if (active) await stop()
    else if (paused) await resume()
    else await start(null)
  }, [active, paused, stop, resume, start])

  return useMemo(
    () => ({ active, paused, carried, start, stop, pause, resume, switchTo, toggle }),
    [active, paused, carried, start, stop, pause, resume, switchTo, toggle]
  )
}
