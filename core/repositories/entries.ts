import { and, asc, eq, isNull } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { areas, entries, entryTags, entryTypes, sessions, stages, tags } from '../db/schema'
import { parseQuickAdd } from '@shared/quick-add-parser'
import { isDoneToday, taskStatus } from '@shared/task-status'
import type {
  Area,
  BoardView,
  ParentCandidate,
  Stage,
  Tag,
  TaskFilter,
  TaskListItem,
  TaskStatus
} from '@shared/types'

interface BuiltItem {
  item: TaskListItem
  status: TaskStatus
  parentId: number | null
  hasChildren: boolean
}

const nowIso = (now: Date): string => now.toISOString()

/** Buduje wszystkie pozycje zadań z relacjami — jedno miejsce składania DTO. */
function buildItems(db: DB): Map<number, BuiltItem> {
  const allEntries = db.select().from(entries).where(isNull(entries.deletedAt)).all()
  const allTypes = db.select().from(entryTypes).all()
  const allStages = db.select().from(stages).all()
  const allAreas = db.select().from(areas).all()

  const typeById = new Map(allTypes.map((t) => [t.id, t]))
  const stageById = new Map(allStages.map((s) => [s.id, s]))
  const areaById = new Map<number, Area>(allAreas.map((a) => [a.id, a]))

  // Pierwszy etap per typ (najniższa pozycja) — do rozróżnienia „ruszone" od „świeżego".
  const firstStageIdByType = new Map<number, number>()
  for (const s of [...allStages].sort((a, b) => a.position - b.position)) {
    if (!firstStageIdByType.has(s.typeId)) firstStageIdByType.set(s.typeId, s.id)
  }

  // Dzieci per rodzic.
  const childrenByParent = new Map<number, typeof allEntries>()
  for (const e of allEntries) {
    if (e.parentId == null) continue
    const arr = childrenByParent.get(e.parentId) ?? []
    arr.push(e)
    childrenByParent.set(e.parentId, arr)
  }

  // Tagi per wpis.
  const tagRows = db
    .select({ entryId: entryTags.entryId, tag: tags })
    .from(entryTags)
    .innerJoin(tags, eq(entryTags.tagId, tags.id))
    .all()
  const tagsByEntry = new Map<number, Tag[]>()
  for (const row of tagRows) {
    const arr = tagsByEntry.get(row.entryId) ?? []
    arr.push(row.tag)
    tagsByEntry.set(row.entryId, arr)
  }

  // Sesje: sumy zakończonych + aktywna (jedna globalnie).
  const secondsByEntry = new Map<number, number>()
  let activeByEntry = new Map<number, string>()
  for (const s of db.select().from(sessions).all()) {
    if (s.entryId == null) continue
    if (s.endedAt == null) {
      activeByEntry.set(s.entryId, s.startedAt)
    } else {
      const dur = Math.max(0, (Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 1000)
      secondsByEntry.set(s.entryId, (secondsByEntry.get(s.entryId) ?? 0) + Math.round(dur))
    }
  }

  const out = new Map<number, BuiltItem>()
  for (const e of allEntries) {
    const type = typeById.get(e.typeId)
    if (!type) continue
    const children = childrenByParent.get(e.id) ?? []
    const hasChildren = children.length > 0
    const stage = e.stageId != null ? stageById.get(e.stageId) : undefined

    // Postęp z podzadań pokazuje każdy wpis, który ma dzieci — niezależnie od typu.
    const childProgress = hasChildren
      ? {
          done: children.filter(
            (c) => c.completedAt != null || (c.stageId != null && stageById.get(c.stageId)?.isDone)
          ).length,
          total: children.length
        }
      : null

    const counter =
      type.progressMode === 'counter' &&
      typeof e.data?.current === 'number' &&
      typeof e.data?.total === 'number'
        ? { current: e.data.current as number, total: e.data.total as number }
        : null

    const activeStart = activeByEntry.get(e.id)

    const item: TaskListItem = {
      id: e.id,
      title: e.title,
      type: { key: type.key, name: type.name, icon: type.icon, progressMode: type.progressMode },
      area: e.areaId != null ? areaById.get(e.areaId) ?? null : null,
      parent: null, // uzupełnione niżej, gdy znamy rodzica
      stage: stage ? { id: stage.id, name: stage.name, isDone: stage.isDone } : null,
      tags: tagsByEntry.get(e.id) ?? [],
      priority: e.priority,
      plannedDate: e.plannedDate,
      dueDate: e.dueDate,
      completedAt: e.completedAt,
      childProgress,
      counter,
      secondsSpent: secondsByEntry.get(e.id) ?? 0,
      activeSession: activeStart ? { startedAt: activeStart } : null
    }

    out.set(e.id, {
      item,
      status: taskStatus(item, firstStageIdByType.get(e.typeId)),
      parentId: e.parentId,
      hasChildren
    })
  }

  // Breadcrumb rodzica.
  for (const built of out.values()) {
    if (built.parentId != null) {
      const parent = out.get(built.parentId)
      if (parent) built.item.parent = { id: parent.item.id, title: parent.item.title }
    }
  }

  return out
}

function matchesFilter(built: BuiltItem, filter: TaskFilter, now: Date): boolean {
  const today = toDateKey(now)
  switch (filter) {
    case 'active':
      // Widok domyślny: w trakcie + do zrobienia + zamknięte dziś (trzecia sekcja).
      return built.status !== 'done' || isDoneToday(built.item, now)
    case 'today':
      return (
        built.item.activeSession != null ||
        built.item.plannedDate === today ||
        (built.item.completedAt != null && toDateKey(new Date(built.item.completedAt)) === today)
      )
    case 'blocked':
      // Placeholder: „po terminie" (brak modelu zależności — do rozbudowy).
      return (
        built.status !== 'done' &&
        built.item.dueDate != null &&
        built.item.dueDate < today
      )
    case 'done':
      return built.status === 'done'
  }
}

/** Lista zadań: ukrywa nadrzędne kontenery (root z dziećmi), filtruje po statusie. */
export function listTasks(db: DB, filter: TaskFilter, now: Date = new Date()): TaskListItem[] {
  const built = [...buildItems(db).values()]
  return built
    .filter((b) => !(b.parentId == null && b.hasChildren)) // kontenery poziomu 0 poza listą
    .filter((b) => matchesFilter(b, filter, now))
    .map((b) => b.item)
}

export function getTask(db: DB, id: number): TaskListItem | null {
  return buildItems(db).get(id)?.item ?? null
}

/**
 * Kandydaci na rodzica do podpowiedzi `>`: wpisy, których typ prowadzi postęp
 * (progressMode != 'none') — czyli projekty, kursy, crackme. Reguła strukturalna,
 * bez sprawdzania nazwy typu.
 */
export function listParentCandidates(db: DB): ParentCandidate[] {
  const typeById = new Map(db.select().from(entryTypes).all().map((t) => [t.id, t]))
  const areaById = new Map(db.select().from(areas).all().map((a) => [a.id, a]))
  return db
    .select()
    .from(entries)
    .where(isNull(entries.deletedAt))
    .all()
    .flatMap((e) => {
      const type = typeById.get(e.typeId)
      if (!type || type.progressMode === 'none') return []
      return [
        {
          id: e.id,
          title: e.title,
          icon: type.icon,
          areaColor: e.areaId != null ? areaById.get(e.areaId)?.color ?? null : null,
          subtitle: type.name
        }
      ]
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** Widok tablicy: etapy danego typu + wszystkie wpisy tego typu (z kontenerami). */
export function listBoard(db: DB, typeId: number): BoardView {
  const type = db.select().from(entryTypes).where(eq(entryTypes.id, typeId)).get()
  if (!type) throw new Error(`Typ ${typeId} nie istnieje`)
  const stageRows: Stage[] = db
    .select()
    .from(stages)
    .where(eq(stages.typeId, typeId))
    .orderBy(asc(stages.position))
    .all()
  const cards = [...buildItems(db).values()].map((b) => b.item).filter((it) => it.type.key === type.key)
  return { stages: stageRows, cards }
}

/** Ustawia etap wpisu; etap końcowy ustawia completedAt, inny go czyści. */
export function setStage(db: DB, entryId: number, stageId: number, now: Date = new Date()): TaskListItem {
  const stage = db.select().from(stages).where(eq(stages.id, stageId)).get()
  if (!stage) throw new Error(`Etap ${stageId} nie istnieje`)
  db.update(entries)
    .set({
      stageId,
      completedAt: stage.isDone ? nowIso(now) : null,
      updatedAt: nowIso(now)
    })
    .where(eq(entries.id, entryId))
    .run()
  const updated = getTask(db, entryId)
  if (!updated) throw new Error(`Wpis ${entryId} zniknął po aktualizacji`)
  return updated
}

/** Odhaczenie / cofnięcie: przełącza między etapem końcowym a pierwszym. */
export function toggleDone(db: DB, id: number, now: Date = new Date()): TaskListItem {
  const entry = db.select().from(entries).where(eq(entries.id, id)).get()
  if (!entry) throw new Error(`Wpis ${id} nie istnieje`)

  const typeStages = db.select().from(stages).where(eq(stages.typeId, entry.typeId)).all()
  const ordered = [...typeStages].sort((a, b) => a.position - b.position)
  const firstStage = ordered[0]
  const doneStage = ordered.find((s) => s.isDone)

  const currentlyDone =
    entry.completedAt != null ||
    (entry.stageId != null && typeStages.find((s) => s.id === entry.stageId)?.isDone === true)

  db.update(entries)
    .set(
      currentlyDone
        ? { stageId: firstStage?.id ?? entry.stageId, completedAt: null, updatedAt: nowIso(now) }
        : { stageId: doneStage?.id ?? entry.stageId, completedAt: nowIso(now), updatedAt: nowIso(now) }
    )
    .where(eq(entries.id, id))
    .run()

  const updated = getTask(db, id)
  if (!updated) throw new Error(`Wpis ${id} zniknął po aktualizacji`)
  return updated
}

/** Szybkie dodawanie: surowa linia → nowy wpis. */
export function quickAdd(db: DB, line: string, now: Date = new Date()): number {
  const parsed = parseQuickAdd(line, now)

  const typeKey = parsed.typeKey ?? 'task'
  const type =
    db.select().from(entryTypes).where(eq(entryTypes.key, typeKey)).get() ??
    db.select().from(entryTypes).where(eq(entryTypes.key, 'task')).get()
  if (!type) throw new Error('Brak typu domyślnego (task) w bazie')

  const firstStage = db
    .select()
    .from(stages)
    .where(eq(stages.typeId, type.id))
    .all()
    .sort((a, b) => a.position - b.position)[0]

  let parentId: number | null = null
  let areaId: number | null = null
  if (parsed.parent) {
    const needle = parsed.parent.toLowerCase()
    const parent = db
      .select()
      .from(entries)
      .where(isNull(entries.deletedAt))
      .all()
      .find((e) => e.title.toLowerCase().includes(needle))
    if (parent) {
      parentId = parent.id
      areaId = parent.areaId
    }
  }

  const inserted = db
    .insert(entries)
    .values({
      typeId: type.id,
      parentId,
      areaId,
      stageId: firstStage?.id ?? null,
      title: parsed.title || line.trim(),
      descriptionMd: null,
      data: {},
      priority: parsed.priority ?? null,
      plannedDate: parsed.plannedDate ?? null,
      createdAt: nowIso(now),
      updatedAt: nowIso(now)
    })
    .returning({ id: entries.id })
    .get()

  for (const parsedTag of parsed.tags) {
    const group = parsedTag.group ?? 'inne'
    const existing = db
      .select()
      .from(tags)
      .where(and(eq(tags.groupName, group), eq(tags.name, parsedTag.name)))
      .get()
    const tagId =
      existing?.id ??
      db
        .insert(tags)
        .values({ groupName: group, name: parsedTag.name, color: null })
        .returning({ id: tags.id })
        .get().id
    db.insert(entryTags).values({ entryId: inserted.id, tagId }).onConflictDoNothing().run()
  }

  return inserted.id
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
