import { and, eq, isNull, or } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { areas, entries, sessions } from '../db/schema'
import type { PausedSession, SessionActive } from '@shared/types'

// Sesja = grupa odcinków: pauza zamyka odcinek, wznowienie otwiera nowy z tym samym group_id
// (id pierwszego odcinka; null w kolumnie = odcinek sam jest grupą). Statystyki liczą grupy.

const nowIso = (now: Date): string => now.toISOString()

type Row = typeof sessions.$inferSelect

const groupKey = (r: Pick<Row, 'id' | 'groupId'>): number => r.groupId ?? r.id

function groupRows(db: DB, groupId: number): Row[] {
  return db
    .select()
    .from(sessions)
    .where(or(eq(sessions.id, groupId), eq(sessions.groupId, groupId)))
    .all()
    .sort((a, b) => a.id - b.id)
}

function closedSeconds(rows: Row[]): number {
  return rows.reduce(
    (sum, r) => (r.endedAt ? sum + Math.max(0, Math.round((Date.parse(r.endedAt) - Date.parse(r.startedAt)) / 1000)) : sum),
    0
  )
}

function entryInfo(db: DB, entryId: number | null): { entryTitle: string | null; areaColor: string | null } {
  const entry = entryId != null ? db.select().from(entries).where(eq(entries.id, entryId)).get() : undefined
  const area = entry?.areaId != null ? db.select().from(areas).where(eq(areas.id, entry.areaId)).get() : undefined
  return { entryTitle: entry?.title ?? null, areaColor: area?.color ?? null }
}

function toActive(db: DB, open: Row): SessionActive {
  const groupId = groupKey(open)
  return {
    id: open.id,
    entryId: open.entryId,
    startedAt: open.startedAt,
    groupId,
    carriedSeconds: closedSeconds(groupRows(db, groupId)),
    ...entryInfo(db, open.entryId)
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

const openRow = (db: DB): Row | undefined => db.select().from(sessions).where(isNull(sessions.endedAt)).get()

function closeOpen(db: DB, now: Date): void {
  db.update(sessions).set({ endedAt: nowIso(now) }).where(isNull(sessions.endedAt)).run()
}

/** Zamyka trwający odcinek i otwiera nowy (w podanej grupie albo jako nowa grupa). Bez transakcji. */
function openSegment(db: DB, entryId: number | null, groupId: number | null, now: Date): Row {
  closeOpen(db, now)
  return db
    .insert(sessions)
    .values({ entryId, startedAt: nowIso(now), endedAt: null, note: null, groupId })
    .returning()
    .get()
}

/** Przypina zadanie do wszystkich odcinków grupy, które go nie mają (czas bez zadania nie przepada). */
function attachGroup(db: DB, groupId: number, entryId: number): void {
  db.update(sessions)
    .set({ entryId })
    .where(and(or(eq(sessions.id, groupId), eq(sessions.groupId, groupId)), isNull(sessions.entryId)))
    .run()
}

export function activeSession(db: DB): SessionActive | null {
  const open = openRow(db)
  return open ? toActive(db, open) : null
}

/** Podsumowanie grupy (wstrzymanej sesji): zadanie z ostatniego odcinka, suma zamkniętego czasu. */
export function sessionGroup(db: DB, groupId: number): PausedSession | null {
  const rows = groupRows(db, groupId)
  const last = rows[rows.length - 1]
  if (!last) return null
  return { groupId, entryId: last.entryId, carriedSeconds: closedSeconds(rows), ...entryInfo(db, last.entryId) }
}

/** Nowa sesja (nowa grupa); jeśli jakaś trwa, najpierw ją zamyka — atomowo. */
export function startSession(db: DB, entryId: number | null, now: Date = new Date()): SessionActive {
  if (entryId != null) assertEntry(db, entryId)
  const open = db.transaction(() => openSegment(db, entryId, null, now))
  return toActive(db, open)
}

export function stopSession(db: DB, now: Date = new Date()): void {
  closeOpen(db, now)
}

/** Liczba odcinków bez końca (kopia z innej bazy może mieć ich więcej niż jeden). */
export function openSessionCount(db: DB): number {
  return db.select({ id: sessions.id }).from(sessions).where(isNull(sessions.endedAt)).all().length
}

/** Pauza: zamyka trwający odcinek i zwraca podsumowanie sesji do wznowienia (null, gdy nic nie trwa). */
export function pauseSession(db: DB, now: Date = new Date()): PausedSession | null {
  const open = openRow(db)
  if (!open) return null
  closeOpen(db, now)
  return sessionGroup(db, groupKey(open))
}

function resumeIn(db: DB, groupId: number, now: Date): Row {
  const rows = groupRows(db, groupId)
  const last = rows[rows.length - 1]
  if (!last) throw new Error(`Sesja ${groupId} nie istnieje`)
  if (last.entryId != null) assertEntry(db, last.entryId)
  return openSegment(db, last.entryId, groupId, now)
}

/** Wznowienie: nowy odcinek w tej samej grupie, na tym samym zadaniu (licznik liczy dalej). */
export function resumeSession(db: DB, groupId: number, now: Date = new Date()): SessionActive {
  const open = db.transaction(() => resumeIn(db, groupId, now))
  return toActive(db, open)
}

/**
 * Przełączenie sesji na zadanie (⇆, „Sesja" w szczegółach):
 * - trwa to samo zadanie → bez zmian; wstrzymane to samo → wznowienie,
 * - sesja bez zadania (trwająca lub wstrzymana) → całą grupę przypinamy do zadania (i wznawiamy),
 * - inne zadanie → bieżący odcinek się kończy (czas zostaje przy starym), nowa sesja na wybranym.
 * `pausedGroupId` — wstrzymana sesja widżetu (odcinki zamknięte, więc nie widać jej w bazie jako trwającej).
 */
export function switchSession(db: DB, entryId: number, now: Date = new Date(), pausedGroupId?: number): SessionActive {
  assertEntry(db, entryId)
  const result = db.transaction((): Row => {
    const open = openRow(db)
    if (open) {
      if (open.entryId === entryId) return open
      if (open.entryId == null) {
        attachGroup(db, groupKey(open), entryId)
        return { ...open, entryId }
      }
      return openSegment(db, entryId, null, now)
    }
    if (pausedGroupId != null) {
      const paused = sessionGroup(db, pausedGroupId)
      if (paused && (paused.entryId === entryId || paused.entryId == null)) {
        if (paused.entryId == null) attachGroup(db, pausedGroupId, entryId)
        return resumeIn(db, pausedGroupId, now)
      }
    }
    return openSegment(db, entryId, null, now)
  })
  return toActive(db, result)
}
