import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { makeTestDb } from '../db/test-utils'
import { seedDemo } from '../db/seed'
import {
  getTask,
  listBoard,
  listParentCandidates,
  listTasks,
  quickAdd,
  searchEntries,
  setStage,
  toggleDone
} from './entries'
import { listTypes } from './types'
import { listAreas } from './areas'
// getTask nie potrzebuje `now` — buduje bieżący stan.

const NOW = new Date(2026, 8, 18, 14, 0, 0) // pt 2026-09-18

let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
  seedDemo(conn.db, NOW)
})

const titles = (items: { title: string }[]): string[] => items.map((i) => i.title)

describe('listTasks', () => {
  it('ukrywa nadrzędne kontenery (root z dziećmi)', () => {
    const active = listTasks(conn.db, 'active', NOW)
    expect(titles(active)).not.toContain('Parser PE w C++')
    expect(titles(active)).not.toContain('pwn.college: Program Security')
  })

  it('pokazuje wpisy w trakcie', () => {
    const active = listTasks(conn.db, 'active', NOW)
    expect(titles(active)).toContain('Import Address Table')
    expect(titles(active)).toContain('babyheap level 3')
  })

  it('liczy childProgress z podzadań (IAT: 1 z 3)', () => {
    const iat = listTasks(conn.db, 'active', NOW).find((i) => i.title === 'Import Address Table')
    expect(iat?.childProgress).toEqual({ done: 1, total: 3 })
  })

  it('sumuje czas z zakończonych sesji (babyheap: 2h40m)', () => {
    const bh = listTasks(conn.db, 'active', NOW).find((i) => i.title === 'babyheap level 3')
    expect(bh?.secondsSpent).toBe((100 + 60) * 60)
  })

  it('oznacza aktywną sesję na IAT', () => {
    const iat = listTasks(conn.db, 'active', NOW).find((i) => i.title === 'Import Address Table')
    expect(iat?.activeSession).not.toBeNull()
  })

  it('filtr done zawiera zamknięte dziś', () => {
    const done = listTasks(conn.db, 'done', NOW)
    expect(titles(done)).toContain('Tabela sekcji')
    expect(titles(done)).not.toContain('babyheap level 3')
  })

  it('filtr blocked łapie wpisy po terminie', () => {
    const blocked = listTasks(conn.db, 'blocked', NOW)
    expect(titles(blocked)).toContain('Nordwind Labs — follow-up po tygodniu')
  })

  it('doczepia breadcrumb rodzica', () => {
    const bh = listTasks(conn.db, 'active', NOW).find((i) => i.title === 'babyheap level 3')
    expect(bh?.parent?.title).toBe('pwn.college: Program Security')
  })
})

describe('toggleDone', () => {
  it('odhacza wpis i cofa odhaczenie', () => {
    const before = listTasks(conn.db, 'active', NOW).find((i) => i.title === 'Przeczytać RFC 793, sekcja 3.4')
    expect(before).toBeDefined()

    const done = toggleDone(conn.db, before!.id, NOW)
    expect(done.completedAt).not.toBeNull()
    expect(done.stage?.isDone).toBe(true)

    const back = toggleDone(conn.db, before!.id, NOW)
    expect(back.completedAt).toBeNull()
    expect(back.stage?.isDone).toBe(false)
  })
})

describe('searchEntries', () => {
  it('puste query → pusto', () => {
    expect(searchEntries(conn.db, '  ')).toEqual([])
  })
  it('znajduje po fragmencie tytułu', () => {
    const r = searchEntries(conn.db, 'babyheap')
    expect(r.some((x) => x.title === 'babyheap level 3')).toBe(true)
    expect(r[0].icon).toBeTruthy()
  })
})

describe('listParentCandidates', () => {
  it('zawiera kontenery (projekt, kurs), pomija zwykłe zadania', () => {
    const titles = listParentCandidates(conn.db).map((c) => c.title)
    expect(titles).toContain('Parser PE w C++')
    expect(titles).toContain('pwn.college: Program Security')
    expect(titles).not.toContain('Przeczytać RFC 793, sekcja 3.4')
  })
})

describe('listBoard / setStage', () => {
  const typeId = (key: string) => listTypes(conn.db).find((t) => t.key === key)!.id

  it('grupuje wpisy typu z etapami (kontenery są kartami)', () => {
    const board = listBoard(conn.db, typeId('project'))
    expect(board.stages.map((s) => s.name)).toContain('Implementacja')
    expect(board.cards.map((c) => c.title)).toContain('Parser PE w C++')
  })

  it('setStage na etap końcowy ustawia completedAt', () => {
    const bh = listTasks(conn.db, 'active', NOW).find((i) => i.title === 'babyheap level 3')!
    const doneStage = listBoard(conn.db, typeId('pwn')).stages.find((s) => s.isDone)!
    const updated = setStage(conn.db, bh.id, doneStage.id, NOW)
    expect(updated.completedAt).not.toBeNull()
    expect(updated.stage?.isDone).toBe(true)
  })
})

describe('quickAdd', () => {
  it('tworzy zadanie z rozpoznanych elementów linii', () => {
    const id = quickAdd(conn.db, 'Sprawdzić glibc tcache /task #lang:python !2 @jutro', NOW)
    const item = getTask(conn.db, id)
    expect(item?.title).toBe('Sprawdzić glibc tcache')
    expect(item?.type.key).toBe('task')
    expect(item?.priority).toBe(2)
    expect(item?.plannedDate).toBe('2026-09-19')
    expect(item?.tags.some((t) => t.groupName === 'lang' && t.name === 'python')).toBe(true)
  })

  it('nieznany typ spada do zadania', () => {
    const id = quickAdd(conn.db, 'coś tam /nieistnieje', NOW)
    expect(getTask(conn.db, id)?.type.key).toBe('task')
  })

  it('dopina rodzica po fuzzy tytule i dziedziczy obszar', () => {
    const id = quickAdd(conn.db, 'Tabela importów >Parser PE', NOW)
    const item = getTask(conn.db, id)
    expect(item?.parent?.title).toBe('Parser PE w C++')
    expect(item?.area?.name).toBe('C++ / Windows')
  })

  it('bez rodzica dziedziczy obszar z kontekstu (otwarty folder)', () => {
    const sieci = listAreas(conn.db).find((a) => a.name === 'Sieci')!.id
    const id = quickAdd(conn.db, 'Nowe zadanie sieciowe', NOW, { areaId: sieci })
    expect(getTask(conn.db, id)?.area?.name).toBe('Sieci')
  })
})
