import { and, eq, isNull } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { areas, entries, sessions } from '../db/schema'
import type { SessionActive } from '@shared/types'

const nowIso = (now: Date): string => now.toISOString()

type SessionRow = { id: number; entryId: number | null; startedAt: string }

/** DTO aktywnej sesji z tytułem zadania i kolorem jego obszaru. */
function toActive(db: DB, s: SessionRow): SessionActive {
  const entry = s.entryId != null ? db.select().from(entries).where(eq(entries.id, s.entryId)).get() : undefined
  const area = entry?.areaId != null ? db.select().from(areas).where(eq(areas.id, entry.areaId)).get() : undefined
  return {
    id: s.id,
    entryId: s.entryId,
    startedAt: s.startedAt,
    entryTitle: entry?.title ?? null,
    areaColor: area?.color ?? null
  }
}

function assertEntry(db: DB, entryId: number): void {
  const found = db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.id, entryId), isNull(entries.deletedAt)))
    .get()
  if (!found) throw new Error(`Wpis ${entryId} nie istnieje`)
}

export function activeSession(db: DB): SessionActive | null {
  const s = db.select().from(sessions).where(isNull(sessions.endedAt)).get()
  return s ? toActive(db, s) : null
}

/** Startuje sesję; jeśli jakaś trwa, najpierw ją zamyka (tylko jedna aktywna) — atomowo. */
export function startSession(db: DB, entryId: number | null, now: Date = new Date()): SessionActive {
  if (entryId != null) assertEntry(db, entryId)
  const startedAt = nowIso(now)
  const id = db.transaction((tx) => {
    tx.update(sessions).set({ endedAt: startedAt }).where(isNull(sessions.endedAt)).run()
    return tx
      .insert(sessions)
      .values({ entryId, startedAt, endedAt: null, note: null })
      .returning({ id: sessions.id })
      .get().id
  })
  return toActive(db, { id, entryId, startedAt })
}

export function stopSession(db: DB, now: Date = new Date()): void {
  db.update(sessions).set({ endedAt: nowIso(now) }).where(isNull(sessions.endedAt)).run()
}

/**
 * Przełącza trwającą sesję na inne zadanie (widżet ⇆):
 * - sesja z zadaniem → bieżący odcinek się kończy, nowy startuje na wybranym (czas zostaje przy starym),
 * - sesja bez zadania → ten sam odcinek zostaje przypięty do wybranego (nic nie przepada),
 * - nic nie trwa → start na wybranym zadaniu.
 */
export function switchSession(db: DB, entryId: number, now: Date = new Date()): SessionActive {
  assertEntry(db, entryId)
  const current = db.select().from(sessions).where(isNull(sessions.endedAt)).get()
  if (current && current.entryId === entryId) return toActive(db, current)
  if (current && current.entryId == null) {
    db.update(sessions).set({ entryId }).where(eq(sessions.id, current.id)).run()
    return toActive(db, { ...current, entryId })
  }
  return startSession(db, entryId, now)
}
