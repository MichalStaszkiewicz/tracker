// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PausedSession, SessionActive } from '@shared/types'

const s = (id: number, entryId: number | null, over: Partial<SessionActive> = {}): SessionActive => ({
  id,
  entryId,
  startedAt: '2026-09-27T10:00:00.000Z',
  groupId: id,
  carriedSeconds: 0,
  entryTitle: entryId == null ? null : `Zadanie ${entryId}`,
  areaColor: null,
  ...over
})
const p = (groupId: number, entryId: number | null, carriedSeconds: number): PausedSession => ({
  groupId,
  entryId,
  entryTitle: entryId == null ? null : `Zadanie ${entryId}`,
  areaColor: null,
  carriedSeconds
})

const active = vi.fn(async (): Promise<SessionActive | null> => null)
const start = vi.fn(async (entryId: number | null) => s(10, entryId))
const stop = vi.fn(async () => undefined)
const pause = vi.fn(async (): Promise<PausedSession | null> => p(5, 42, 120))
const resume = vi.fn(async (groupId: number) => s(11, 42, { groupId, carriedSeconds: 120 }))
const switchFn = vi.fn(async (entryId: number, _paused?: number) => s(12, entryId))
const group = vi.fn(async (groupId: number) => p(groupId, 42, 120))

vi.mock('@/api', () => ({
  api: {
    sessions: {
      active: () => active(),
      start: (id: number | null) => start(id),
      stop: () => stop(),
      pause: () => pause(),
      resume: (g: number) => resume(g),
      switch: (id: number, paused?: number) => switchFn(id, paused),
      group: (g: number) => group(g)
    }
  }
}))

const { useSession } = await import('./useSession')

beforeEach(() => {
  for (const f of [active, start, stop, pause, resume, switchFn, group]) f.mockClear()
})
afterEach(cleanup)

/** Hook z trwającą sesją (odcinek 5) na zadaniu 42. */
async function running() {
  active.mockResolvedValueOnce(s(5, 42))
  const view = renderHook(() => useSession())
  await waitFor(() => expect(view.result.current.active?.id).toBe(5))
  return view
}

describe('useSession', () => {
  it('pauza → stan wstrzymany z bazy; wznowienie tej samej grupy', async () => {
    const { result } = await running()
    await act(() => result.current.pause())
    expect(pause).toHaveBeenCalledTimes(1)
    expect(result.current.active).toBeNull()
    expect(result.current.paused).toMatchObject({ groupId: 5, carriedSeconds: 120 })
    await act(() => result.current.resume())
    expect(resume).toHaveBeenCalledWith(5)
    expect(result.current.active).toMatchObject({ groupId: 5, carriedSeconds: 120 })
    expect(result.current.paused).toBeNull()
  })

  it('szybki dwuklik „pauza" wysyła jedną operację', async () => {
    const { result } = await running()
    await act(async () => {
      await Promise.all([result.current.pause(), result.current.pause()])
    })
    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('⇆ w pauzie przekazuje wstrzymaną grupę (core przypnie/wznowi zamiast zerować)', async () => {
    const { result } = await running()
    await act(() => result.current.pause())
    await act(() => result.current.switchTo(7))
    expect(switchFn).toHaveBeenCalledWith(7, 5)
    expect(result.current.paused).toBeNull()
  })

  it('„Sesja" na zadaniu idzie przez switch (to samo zadanie nie zeruje licznika); bez zadania — nowa sesja', async () => {
    const { result } = await running()
    await act(() => result.current.start(42))
    expect(switchFn).toHaveBeenCalledWith(42, undefined)
    expect(start).not.toHaveBeenCalled()
    await act(() => result.current.start(null))
    expect(start).toHaveBeenCalledWith(null)
  })

  it('toggle: trwa → stop; wstrzymana → wznów; nic → start bez zadania', async () => {
    const { result } = await running()
    await act(() => result.current.pause())
    await act(() => result.current.toggle())
    expect(resume).toHaveBeenCalledWith(5)
    await act(() => result.current.toggle())
    expect(result.current.active).toBeNull()
    await act(() => result.current.toggle())
    expect(start).toHaveBeenLastCalledWith(null)
  })

  it('stop wstrzymanej sesji tylko chowa widżet (odcinki już zamknięte)', async () => {
    const { result } = await running()
    await act(() => result.current.pause())
    await act(() => result.current.stop())
    expect(stop).not.toHaveBeenCalled()
    expect(result.current.paused).toBeNull()
  })

  it('refresh: aktualny tytuł po edycji zadania (trwająca i wstrzymana)', async () => {
    const { result } = await running()
    active.mockResolvedValueOnce(s(5, 42, { entryTitle: 'Nowy tytuł' }))
    await act(() => result.current.refresh())
    expect(result.current.active?.entryTitle).toBe('Nowy tytuł')
    await act(() => result.current.pause())
    await act(() => result.current.refresh())
    expect(group).toHaveBeenCalledWith(5)
  })

  it('błąd api (np. usunięte zadanie) → synchronizacja z bazą', async () => {
    const { result } = await running()
    switchFn.mockRejectedValueOnce(new Error('Wpis 999 nie istnieje'))
    active.mockResolvedValueOnce(s(5, 42))
    await act(() => result.current.switchTo(999))
    expect(result.current.active?.id).toBe(5)
  })
})
