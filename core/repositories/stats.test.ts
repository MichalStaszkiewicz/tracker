import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { makeTestDb } from '../db/test-utils'
import { areas, entries, entryTypes, sessions } from '../db/schema'
import { getStats } from './stats'

const NOW = new Date(2026, 8, 18, 14, 0, 0) // pt 2026-09-18
const iso = (y: number, mo: number, d: number, h: number, mi: number) =>
  new Date(y, mo, d, h, mi, 0).toISOString()

let conn: Connection
let entryId: number
let areaName: string

beforeEach(() => {
  conn = makeTestDb()
  const { db } = conn
  const typeId = db
    .insert(entryTypes)
    .values({ key: 't', name: 'T', icon: '', fields: [], progressMode: 'none', template: [], position: 0 })
    .returning({ id: entryTypes.id })
    .get().id
  const areaId = db
    .insert(areas)
    .values({ name: 'pwn.college', color: '#111', position: 0 })
    .returning({ id: areas.id })
    .get().id
  areaName = 'pwn.college'
  entryId = db
    .insert(entries)
    .values({ typeId, areaId, title: 'E', data: {}, createdAt: iso(2026, 8, 1, 0, 0), updatedAt: iso(2026, 8, 1, 0, 0) })
    .returning({ id: entries.id })
    .get().id

  // dziś 40 min, wczoraj 30 min, 2 dni temu 10 min (poniżej progu 25)
  db.insert(sessions).values({ entryId, startedAt: iso(2026, 8, 18, 12, 0), endedAt: iso(2026, 8, 18, 12, 40) }).run()
  db.insert(sessions).values({ entryId, startedAt: iso(2026, 8, 17, 13, 0), endedAt: iso(2026, 8, 17, 13, 30) }).run()
  db.insert(sessions).values({ entryId, startedAt: iso(2026, 8, 16, 10, 0), endedAt: iso(2026, 8, 16, 10, 10) }).run()
  // aktywna sesja (bez endedAt) — ignorowana
  db.insert(sessions).values({ entryId, startedAt: iso(2026, 8, 18, 13, 0), endedAt: null }).run()
})

describe('getStats', () => {
  it('liczy czas dziś i w oknie tygodnia', () => {
    const s = getStats(conn.db, 'week', NOW)
    expect(s.todayMinutes).toBe(40)
    expect(s.periodMinutes).toBe(80)
    expect(s.sessionCount).toBe(3)
    expect(s.avgSessionMinutes).toBe(27)
  })

  it('streak liczy kolejne dni od progu (dziś, wczoraj), zatrzymuje na dniu poniżej progu', () => {
    expect(getStats(conn.db, 'week', NOW).streakDays).toBe(2)
  })

  it('heatmapa ma 126 dni, ostatni to dziś', () => {
    const s = getStats(conn.db, 'week', NOW)
    expect(s.heatmap).toHaveLength(126)
    expect(s.heatmap[125]).toEqual({ date: '2026-09-18', minutes: 40 })
  })

  it('czas na obszar sumuje po obszarze', () => {
    const s = getStats(conn.db, 'week', NOW)
    expect(s.areaTime[0]).toMatchObject({ name: areaName, minutes: 80 })
  })

  it('ignoruje aktywną sesję (bez endedAt)', () => {
    // gdyby liczyła aktywną, todayMinutes byłby > 40
    expect(getStats(conn.db, 'week', NOW).todayMinutes).toBe(40)
  })
})
