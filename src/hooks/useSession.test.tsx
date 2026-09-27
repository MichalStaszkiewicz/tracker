// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionActive } from '@shared/types'

const at = (hms: string) => `2026-09-27T${hms}.000Z`
const mk = (id: number, entryId: number | null, startedAt: string): SessionActive => ({
  id,
  entryId,
  startedAt,
  entryTitle: entryId == null ? null : `Zadanie ${entryId}`,
  areaColor: null
})

const active = vi.fn(async (): Promise<SessionActive | null> => null)
const start = vi.fn(async (entryId: number | null) => mk(10, entryId, at('10:00:00')))
const stop = vi.fn(async () => undefined)
const switchFn = vi.fn(async (entryId: number) => mk(11, entryId, at('10:00:00')))

vi.mock('@/api', () => ({
  api: {
    sessions: {
      active: () => active(),
      start: (id: number | null) => start(id),
      stop: () => stop(),
      switch: (id: number) => switchFn(id)
    }
  }
}))

const { useSession } = await import('./useSession')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(at('10:00:00')))
  for (const f of [active, start, stop, switchFn]) f.mockClear()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** Hook z trwającą sesją na zadaniu 42, rozpoczętą 2 minuty temu. */
async function running() {
  active.mockResolvedValueOnce(mk(5, 42, at('09:58:00')))
  const view = renderHook(() => useSession())
  await waitFor(() => expect(view.result.current.active?.id).toBe(5))
  return view
}

describe('useSession', () => {
  it('pauza zamyka odcinek i pamięta zadanie oraz czas; wznowienie liczy dalej na tym samym zadaniu', async () => {
    const { result } = await running()
    await act(() => result.current.pause())
    expect(stop).toHaveBeenCalledTimes(1)
    expect(result.current.active).toBeNull()
    expect(result.current.paused).toMatchObject({ entryId: 42, entryTitle: 'Zadanie 42' })
    expect(result.current.carried).toBe(120)

    await act(() => result.current.resume())
    expect(start).toHaveBeenCalledWith(42)
    expect(result.current.paused).toBeNull()
    expect(result.current.carried).toBe(120) // licznik nie wraca do zera
  })

  it('szybki dwuklik „pauza" nie dolicza odcinka dwa razy', async () => {
    const { result } = await running()
    await act(async () => {
      await Promise.all([result.current.pause(), result.current.pause()])
    })
    expect(stop).toHaveBeenCalledTimes(1)
    expect(result.current.carried).toBe(120)
  })

  it('przełączenie na nowy odcinek zeruje licznik; przypięcie tego samego odcinka go zachowuje', async () => {
    const { result } = await running()
    await act(() => result.current.pause())
    await act(() => result.current.resume()) // odcinek id 10, carried 120
    switchFn.mockResolvedValueOnce(mk(10, 7, at('10:00:00'))) // ten sam odcinek (przypięty)
    await act(() => result.current.switchTo(7))
    expect(result.current.carried).toBe(120)
    await act(() => result.current.switchTo(8)) // nowy odcinek (id 11)
    expect(result.current.active?.entryId).toBe(8)
    expect(result.current.carried).toBe(0)
  })

  it('toggle: trwa → stop; wstrzymana → wznów; nic → start bez zadania', async () => {
    const { result } = await running()
    await act(() => result.current.pause())
    await act(() => result.current.toggle())
    expect(start).toHaveBeenLastCalledWith(42) // wznowienie
    await act(() => result.current.toggle())
    expect(result.current.active).toBeNull() // stop
    await act(() => result.current.toggle())
    expect(start).toHaveBeenLastCalledWith(null)
  })

  it('stop wstrzymanej sesji tylko chowa widżet (odcinek już zamknięty)', async () => {
    const { result } = await running()
    await act(() => result.current.pause())
    await act(() => result.current.stop())
    expect(stop).toHaveBeenCalledTimes(1) // tylko z pauzy
    expect(result.current.paused).toBeNull()
    expect(result.current.carried).toBe(0)
  })

  it('błąd api (np. usunięte zadanie) → synchronizacja z bazą zamiast zawieszonego stanu', async () => {
    const { result } = await running()
    switchFn.mockRejectedValueOnce(new Error('Wpis 999 nie istnieje'))
    active.mockResolvedValueOnce(mk(5, 42, at('09:58:00')))
    await act(() => result.current.switchTo(999))
    expect(result.current.active?.id).toBe(5)
  })
})
