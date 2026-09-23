import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { makeTestDb } from '../db/test-utils'
import { seedDemo } from '../db/seed'
import {
  getTask,
  listBoard,
  listParentCandidates,
  listTasks,
  moveEntry,
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

describe('kolejność zadań (moveEntry)', () => {
  const ids = (): number[] => listTasks(conn.db, 'active', NOW).map((i) => i.id)

  it('przenosi zadanie PRZED cel', () => {
    const before = ids()
    const last = before[before.length - 1]
    moveEntry(conn.db, last, before[0], 'before')
    expect(ids()).toEqual([last, ...before.slice(0, -1)])
  })

  it('przenosi zadanie ZA cel', () => {
    const before = ids()
    const first = before[0]
    moveEntry(conn.db, first, before[2], 'after')
    expect(ids()).toEqual([before[1], before[2], first, ...before.slice(3)])
  })

  it('pozostałe zadania (także ukryte filtrem) zachowują względną kolejność', () => {
    const done = listTasks(conn.db, 'done', NOW).map((i) => i.id)
    const before = ids()
    moveEntry(conn.db, before[before.length - 1], before[0], 'before')
    expect(listTasks(conn.db, 'done', NOW).map((i) => i.id)).toEqual(done)
  })

  it('nowe zadanie z szybkiego dodawania ląduje na końcu — także po przestawieniu', () => {
    const before = ids()
    moveEntry(conn.db, before[before.length - 1], before[0], 'before')
    const id = quickAdd(conn.db, 'Świeże zadanie', NOW)
    const after = ids()
    expect(after[after.length - 1]).toBe(id)
  })

  it('przeniesienie na samego siebie nic nie zmienia', () => {
    const before = ids()
    moveEntry(conn.db, before[1], before[1], 'before')
    expect(ids()).toEqual(before)
  })

  it('rzuca dla nieistniejącego celu', () => {
    expect(() => moveEntry(conn.db, ids()[0], 999999, 'before')).toThrow()
  })

  it('przenosi i ustawia datę sekcji w jednej operacji (patch)', () => {
    const before = ids()
    const last = before[before.length - 1]
    moveEntry(conn.db, last, before[0], 'before', { plannedDate: '2026-09-25' }, NOW)
    expect(ids()[0]).toBe(last)
    expect(getTask(conn.db, last)?.plannedDate).toBe('2026-09-25')
  })

  it('patch obszaru razem z pozycją', () => {
    const before = ids()
    const praca = listAreas(conn.db).find((a) => a.name === 'Praca')!
    moveEntry(conn.db, before[0], before[1], 'after', { areaId: praca.id }, NOW)
    expect(ids().slice(0, 2)).toEqual([before[1], before[0]])
    expect(getTask(conn.db, before[0])?.area?.name).toBe('Praca')
  })

  it('nieistniejąca data w patchu → błąd i brak jakiejkolwiek zmiany (także kolejności)', () => {
    const before = ids()
    const last = before[before.length - 1]
    expect(() => moveEntry(conn.db, last, before[0], 'before', { plannedDate: '2026-02-31' }, NOW)).toThrow(/data/i)
    expect(ids()).toEqual(before)
  })

  it('patch na samego siebie zmienia tylko pole, nie kolejność', () => {
    const before = ids()
    moveEntry(conn.db, before[1], before[1], 'before', { plannedDate: null }, NOW)
    expect(ids()).toEqual(before)
    expect(getTask(conn.db, before[1])?.plannedDate).toBeNull()
  })
})

describe('filtr Dziś — zaległe', () => {
  // NOW = pt 2026-09-18
  const todayIds = () => listTasks(conn.db, 'today', NOW).map((i) => i.id)

  it('pokazuje niezrobione zadanie zaplanowane na wcześniej', () => {
    const id = quickAdd(conn.db, 'Zaległe zadanie @2026-09-16', NOW)
    expect(todayIds()).toContain(id)
  })

  it('nie pokazuje zrobionego zadania z przeszłości', () => {
    const id = quickAdd(conn.db, 'Zrobione dawno @2026-09-10', NOW)
    toggleDone(conn.db, id, new Date(2026, 8, 10, 12, 0, 0))
    expect(todayIds()).not.toContain(id)
  })

  it('nie pokazuje zadania na jutro', () => {
    const id = quickAdd(conn.db, 'Jutrzejsze @jutro', NOW)
    expect(todayIds()).not.toContain(id)
  })
})

describe('quickAdd — data z kontekstu widoku', () => {
  it('bez @ bierze datę z kontekstu (np. filtr Dziś), żeby zadanie nie znikło z widoku', () => {
    const id = quickAdd(conn.db, 'Dodane w widoku Dziś', NOW, { plannedDate: '2026-09-18' })
    expect(getTask(conn.db, id)?.plannedDate).toBe('2026-09-18')
    expect(listTasks(conn.db, 'today', NOW).map((i) => i.id)).toContain(id)
  })

  it('jawne @ ma pierwszeństwo przed kontekstem', () => {
    const id = quickAdd(conn.db, 'Jawne @jutro', NOW, { plannedDate: '2026-09-18' })
    expect(getTask(conn.db, id)?.plannedDate).toBe('2026-09-19')
  })

  it('odrzuca nieistniejącą datę z kontekstu', () => {
    expect(() => quickAdd(conn.db, 'Zła data', NOW, { plannedDate: '2026-02-31' })).toThrow(/data/i)
  })
})
