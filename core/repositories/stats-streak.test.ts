import { beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { makeTestDb } from '../db/test-utils'
import { sessions } from '../db/schema'
import { getStats } from './stats'

// Osobny plik na logikę streaka z „forą na trwający dzień" (próg domyślny 25 min).
const NOW = new Date(2026, 8, 18, 14, 0, 0)

let conn: Connection
beforeEach(() => {
  conn = makeTestDb()
})

/** Sesja `offsetDays` dni temu, `mins` minut. */
function addSession(offsetDays: number, mins: number) {
  const start = new Date(2026, 8, 18 - offsetDays, 10, 0, 0)
  const end = new Date(start.getTime() + mins * 60_000)
  conn.db
    .insert(sessions)
    .values({ entryId: null, startedAt: start.toISOString(), endedAt: end.toISOString() })
    .run()
}

const streak = () => getStats(conn.db, 'week', NOW).streakDays

describe('streak — fora na trwający dzień', () => {
  it('pusty dziś NIE zrywa streaka utrzymanego do wczoraj', () => {
    addSession(1, 30) // wczoraj
    addSession(2, 30) // przedwczoraj
    expect(streak()).toBe(2)
  })

  it('pusty dziś i wczoraj → streak 0 (bez zawyżania)', () => {
    addSession(3, 30)
    expect(streak()).toBe(0)
  })

  it('dziś poniżej progu (>0) korzysta z fory i liczy od wczoraj', () => {
    addSession(0, 10) // dziś, poniżej progu
    addSession(1, 30) // wczoraj
    expect(streak()).toBe(1)
  })

  it('dziś powyżej progu liczy dziś i wcześniejsze dni', () => {
    addSession(0, 40)
    addSession(1, 30)
    expect(streak()).toBe(2)
  })

  it('dzień poniżej progu w środku przerywa liczenie', () => {
    addSession(0, 40)
    addSession(1, 10) // wczoraj poniżej progu
    addSession(2, 40)
    expect(streak()).toBe(1)
  })
})
