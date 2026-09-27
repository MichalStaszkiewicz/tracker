import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { sessions } from '../db/schema'
import { makeTestDb } from '../db/test-utils'
import { seedDemo } from '../db/seed'
import { listTasks } from './entries'
import { activeSession, startSession, stopSession, switchSession } from './sessions'

const NOW = new Date(2026, 8, 18, 14, 0, 0)
const LATER = new Date(2026, 8, 18, 14, 30, 0)

let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
  seedDemo(conn.db, NOW) // seed zostawia aktywną sesję na „Import Address Table"
})

const idOf = (title: string): number => listTasks(conn.db, 'active', NOW).find((i) => i.title === title)!.id
const all = () => conn.db.select().from(sessions).all()

describe('activeSession', () => {
  it('zwraca tytuł zadania i kolor obszaru — widżet działa na każdym ekranie', () => {
    const s = activeSession(conn.db)!
    expect(s.entryTitle).toBe('Import Address Table')
    expect(s.areaColor).toMatch(/^#|^oklch|^var\(/)
  })

  it('null, gdy nic nie trwa', () => {
    stopSession(conn.db, NOW)
    expect(activeSession(conn.db)).toBeNull()
  })

  it('sesja bez zadania: brak tytułu i koloru', () => {
    startSession(conn.db, null, NOW)
    expect(activeSession(conn.db)).toMatchObject({ entryId: null, entryTitle: null, areaColor: null })
  })
})

describe('startSession', () => {
  it('zamyka poprzednią (tylko jedna aktywna) i zwraca pełne DTO', () => {
    const rfc = idOf('Przeczytać RFC 793, sekcja 3.4')
    const s = startSession(conn.db, rfc, NOW)
    expect(s.entryTitle).toBe('Przeczytać RFC 793, sekcja 3.4')
    expect(all().filter((x) => x.endedAt === null)).toHaveLength(1)
  })

  it('odrzuca nieistniejące zadanie i niczego nie zmienia', () => {
    const before = all()
    expect(() => startSession(conn.db, 999999, NOW)).toThrow()
    expect(all()).toEqual(before)
  })
})

describe('switchSession', () => {
  it('z zadaniem: kończy bieżący odcinek i zaczyna nowy na wybranym zadaniu', () => {
    const iat = idOf('Import Address Table')
    const rfc = idOf('Przeczytać RFC 793, sekcja 3.4')
    const before = activeSession(conn.db)!
    const s = switchSession(conn.db, rfc, LATER)
    expect(s.entryId).toBe(rfc)
    expect(s.startedAt).toBe(LATER.toISOString())
    const old = conn.db.select().from(sessions).where(eq(sessions.id, before.id)).get()!
    expect(old.entryId).toBe(iat) // czas sprzed przełączenia zostaje przy starym zadaniu
    expect(old.endedAt).toBe(LATER.toISOString())
  })

  it('bez zadania: przypina bieżący odcinek (ten sam start) zamiast go dzielić', () => {
    const started = startSession(conn.db, null, NOW)
    const rfc = idOf('Przeczytać RFC 793, sekcja 3.4')
    const s = switchSession(conn.db, rfc, LATER)
    expect(s.id).toBe(started.id)
    expect(s.startedAt).toBe(NOW.toISOString())
    expect(s.entryId).toBe(rfc)
  })

  it('gdy nic nie trwa: startuje sesję na wybranym zadaniu', () => {
    stopSession(conn.db, NOW)
    const rfc = idOf('Przeczytać RFC 793, sekcja 3.4')
    expect(switchSession(conn.db, rfc, LATER).entryId).toBe(rfc)
  })

  it('nieistniejące zadanie: błąd, bieżąca sesja nietknięta', () => {
    const before = activeSession(conn.db)
    expect(() => switchSession(conn.db, 999999, LATER)).toThrow()
    expect(activeSession(conn.db)).toEqual(before)
  })
})
