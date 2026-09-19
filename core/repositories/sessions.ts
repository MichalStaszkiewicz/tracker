import { isNull } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { sessions } from '../db/schema'
import type { SessionActive } from '@shared/types'

const nowIso = (now: Date): string => now.toISOString()

export function activeSession(db: DB): SessionActive | null {
  const s = db.select().from(sessions).where(isNull(sessions.endedAt)).get()
  return s ? { id: s.id, entryId: s.entryId, startedAt: s.startedAt } : null
}

/** Startuje sesję; jeśli jakaś trwa, najpierw ją zamyka (tylko jedna aktywna). */
export function startSession(db: DB, entryId: number | null, now: Date = new Date()): SessionActive {
  stopSession(db, now)
  const inserted = db
    .insert(sessions)
    .values({ entryId, startedAt: nowIso(now), endedAt: null, note: null })
    .returning({ id: sessions.id })
    .get()
  return { id: inserted.id, entryId, startedAt: nowIso(now) }
}

export function stopSession(db: DB, now: Date = new Date()): void {
  db.update(sessions).set({ endedAt: nowIso(now) }).where(isNull(sessions.endedAt)).run()
}
