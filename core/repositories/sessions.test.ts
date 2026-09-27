import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { entries, sessions } from '../db/schema'
import { makeTestDb } from '../db/test-utils'
import { seedDemo } from '../db/seed'
import { listTasks } from './entries'
import {
  activeSession,
  pauseSession,
  resumeSession,
  sessionGroup,
  startSession,
  stopSession,
  switchSession
} from './sessions'
import { getStats } from './stats'

const T0 = new Date(2026, 8, 18, 14, 0, 0)
const T1 = new Date(2026, 8, 18, 14, 10, 0) // +10 min
const T2 = new Date(2026, 8, 18, 14, 12, 0)
const T3 = new Date(2026, 8, 18, 14, 20, 0)

let conn: Connection
let iat: number
let rfc: number
beforeEach(() => {
  conn = makeTestDb()
  seedDemo(conn.db, T0)
  stopSession(conn.db, T0) // seed zostawia aktywną sesję — zaczynamy od czystej sytuacji
  const tasks = listTasks(conn.db, 'active', T0)
  iat = tasks.find((i) => i.title === 'Import Address Table')!.id
  rfc = tasks.find((i) => i.title === 'Przeczytać RFC 793, sekcja 3.4')!.id
})

const rows = () => conn.db.select().from(sessions).all()
const row = (id: number) => conn.db.select().from(sessions).where(eq(sessions.id, id)).get()!

describe('startSession / activeSession', () => {
  it('nowa sesja = nowa grupa; DTO niesie tytuł, kolor obszaru, zero przeniesionego czasu', () => {
    const s = startSession(conn.db, iat, T0)
    expect(s).toMatchObject({ entryId: iat, groupId: s.id, carriedSeconds: 0, entryTitle: 'Import Address Table' })
    expect(s.areaColor).toBeTruthy()
    expect(activeSession(conn.db)).toEqual(s)
  })

  it('zamyka poprzednią (tylko jedna aktywna)', () => {
    startSession(conn.db, iat, T0)
    startSession(conn.db, rfc, T1)
    expect(rows().filter((r) => r.endedAt === null)).toHaveLength(1)
  })

  it('sesja bez zadania: brak tytułu i koloru; nic nie trwa → null', () => {
    expect(startSession(conn.db, null, T0)).toMatchObject({ entryId: null, entryTitle: null, areaColor: null })
    stopSession(conn.db, T1)
    expect(activeSession(conn.db)).toBeNull()
  })

  it('odrzuca nieistniejące i usunięte (kosz) zadanie, niczego nie zmieniając', () => {
    const before = rows()
    expect(() => startSession(conn.db, 999999, T0)).toThrow()
    conn.db.update(entries).set({ deletedAt: T0.toISOString() }).where(eq(entries.id, rfc)).run()
    expect(() => startSession(conn.db, rfc, T0)).toThrow()
    expect(rows()).toEqual(before)
  })
})

describe('pauseSession / resumeSession', () => {
  it('pauza zamyka odcinek i zwraca podsumowanie grupy; wznowienie kontynuuje tę samą grupę', () => {
    const s = startSession(conn.db, iat, T0)
    const p = pauseSession(conn.db, T1)!
    expect(p).toMatchObject({ groupId: s.id, entryId: iat, carriedSeconds: 600, entryTitle: 'Import Address Table' })
    expect(activeSession(conn.db)).toBeNull()

    const r = resumeSession(conn.db, p.groupId, T2)
    expect(r).toMatchObject({ groupId: s.id, entryId: iat, carriedSeconds: 600 })
    expect(r.id).not.toBe(s.id) // nowy odcinek, ta sama grupa
  })

  it('pauza, gdy nic nie trwa → null', () => {
    expect(pauseSession(conn.db, T0)).toBeNull()
  })

  it('wznowienie nieznanej grupy → błąd', () => {
    expect(() => resumeSession(conn.db, 999999, T0)).toThrow()
  })

  it('sessionGroup: aktualne podsumowanie (np. po zmianie tytułu zadania)', () => {
    const s = startSession(conn.db, iat, T0)
    pauseSession(conn.db, T1)
    conn.db.update(entries).set({ title: 'IAT v2' }).where(eq(entries.id, iat)).run()
    expect(sessionGroup(conn.db, s.id)).toMatchObject({ entryTitle: 'IAT v2', carriedSeconds: 600 })
  })
})

describe('switchSession', () => {
  it('trwa zadanie A → nowy odcinek na B w nowej grupie; czas zostaje przy A', () => {
    const a = startSession(conn.db, iat, T0)
    const b = switchSession(conn.db, rfc, T1)
    expect(b).toMatchObject({ entryId: rfc, groupId: b.id, carriedSeconds: 0 })
    expect(row(a.id)).toMatchObject({ entryId: iat, endedAt: T1.toISOString() })
  })

  it('to samo zadanie, które trwa → bez zmian (ten sam odcinek, nic nie zamknięte)', () => {
    const a = startSession(conn.db, iat, T0)
    const count = rows().length
    const s = switchSession(conn.db, iat, T1)
    expect(s.id).toBe(a.id)
    expect(row(a.id).endedAt).toBeNull()
    expect(rows()).toHaveLength(count)
  })

  it('regresja: sesja bez zadania (z pauzą w środku) → CAŁA grupa trafia do wybranego zadania', () => {
    const s = startSession(conn.db, null, T0)
    pauseSession(conn.db, T1) // 10 min bez zadania
    const r = resumeSession(conn.db, s.id, T2)
    const x = switchSession(conn.db, rfc, T3)
    expect(x.id).toBe(r.id) // bieżący odcinek trwa dalej
    expect(x).toMatchObject({ entryId: rfc, carriedSeconds: 600, entryTitle: 'Przeczytać RFC 793, sekcja 3.4' })
    expect(row(s.id).entryId).toBe(rfc) // odcinek sprzed pauzy też
  })

  it('regresja: wstrzymana sesja bez zadania + wybór zadania → przypięcie grupy i wznowienie', () => {
    const s = startSession(conn.db, null, T0)
    pauseSession(conn.db, T1)
    const x = switchSession(conn.db, rfc, T2, s.id)
    expect(x).toMatchObject({ groupId: s.id, entryId: rfc, carriedSeconds: 600 })
    expect(row(s.id).entryId).toBe(rfc)
  })

  it('wstrzymane zadanie A + wybór A → wznowienie (licznik nie wraca do zera)', () => {
    const a = startSession(conn.db, iat, T0)
    pauseSession(conn.db, T1)
    expect(switchSession(conn.db, iat, T2, a.id)).toMatchObject({ groupId: a.id, carriedSeconds: 600 })
  })

  it('wstrzymane zadanie A + wybór B → nowa sesja na B', () => {
    const a = startSession(conn.db, iat, T0)
    pauseSession(conn.db, T1)
    const b = switchSession(conn.db, rfc, T2, a.id)
    expect(b).toMatchObject({ entryId: rfc, groupId: b.id, carriedSeconds: 0 })
    expect(row(a.id).entryId).toBe(iat)
  })

  it('nic nie trwa → start na wybranym zadaniu', () => {
    expect(switchSession(conn.db, rfc, T0).entryId).toBe(rfc)
  })

  it('usunięte zadanie → błąd, bieżąca sesja nietknięta', () => {
    const a = startSession(conn.db, iat, T0)
    conn.db.update(entries).set({ deletedAt: T0.toISOString() }).where(eq(entries.id, rfc)).run()
    expect(() => switchSession(conn.db, rfc, T1)).toThrow()
    expect(activeSession(conn.db)?.id).toBe(a.id)
  })
})

describe('statystyki liczą sesje, nie odcinki', () => {
  it('regresja: pauza + wznowienie to wciąż jedna sesja (średnia nie spada)', () => {
    const s = startSession(conn.db, iat, T0)
    pauseSession(conn.db, T1)
    resumeSession(conn.db, s.id, T2)
    stopSession(conn.db, T3) // 10 + 8 min
    const before = getStats(conn.db, 'week', T3)
    // sesje z seeda też się liczą — porównujemy przyrost względem stanu bez naszej sesji
    const seedOnly = makeTestDb()
    seedDemo(seedOnly.db, T0)
    stopSession(seedOnly.db, T0)
    const base = getStats(seedOnly.db, 'week', T3)
    expect(before.sessionCount - base.sessionCount).toBe(1)
    expect(before.periodMinutes - base.periodMinutes).toBe(18)
  })
})
