import { addDaysKey, toDateKey } from '@shared/dates'
import { taskStatus } from '@shared/task-status'
import type { MovePatch, TaskListItem, TaskStatus } from '@shared/types'

export type GroupBy = 'status' | 'area' | 'type' | 'date'

export interface TaskFilters {
  typeKey?: string
  tagId?: number
  areaId?: number
  query?: string
}

/** Zawężenie listy po obszarze, typie, tagu i tekście — czyste, po stronie renderera. */
export function filterTasks(tasks: TaskListItem[], f: TaskFilters): TaskListItem[] {
  const q = f.query?.trim().toLowerCase()
  return tasks.filter((it) => {
    if (f.areaId != null && it.area?.id !== f.areaId) return false
    if (f.typeKey && it.type.key !== f.typeKey) return false
    if (f.tagId != null && !it.tags.some((t) => t.id === f.tagId)) return false
    if (q && !it.title.toLowerCase().includes(q)) return false
    return true
  })
}

export type DateBucketKind = 'overdue' | 'today' | 'tomorrow' | 'day' | 'none' | 'done'

export interface TaskGroup {
  key: string
  label: string | null // area/type: gotowa etykieta; status/date: null (ekran tłumaczy)
  status?: TaskStatus
  date?: { kind: DateBucketKind; dateKey?: string }
  /**
   * Co zapisać, gdy zadanie z INNEJ sekcji zostanie tu upuszczone. Brak = sekcja przyjmuje
   * tylko zmianę kolejności własnych zadań (status i typ są wyliczane / zbyt destrukcyjne).
   */
  patch?: MovePatch
  items: TaskListItem[]
}

export interface GroupOptions {
  now?: Date
  /** Przy grupowaniu po dacie: zawsze pokaż Dziś/Jutro/Bez daty (puste = strefy upuszczania). */
  ensureDateBuckets?: boolean
}

const STATUS_ORDER: TaskStatus[] = ['in_progress', 'todo', 'done']

export const isDone = (it: TaskListItem): boolean => it.completedAt != null || it.stage?.isDone === true

/** Grupowanie listy. Kolejność zadań wewnątrz sekcji = kolejność wejścia (ręczna kolejność). */
export function groupTasks(tasks: TaskListItem[], groupBy: GroupBy, opts: GroupOptions = {}): TaskGroup[] {
  if (groupBy === 'status') {
    const by: Record<TaskStatus, TaskListItem[]> = { in_progress: [], todo: [], done: [] }
    for (const it of tasks) by[taskStatus(it)].push(it)
    return STATUS_ORDER.filter((s) => by[s].length > 0).map((s) => ({ key: s, label: null, status: s, items: by[s] }))
  }

  if (groupBy === 'date') return groupByDate(tasks, opts)

  if (groupBy === 'area') {
    // Klucz = id obszaru (nazwy mogą się powtarzać); sortowanie po etykiecie.
    const map = new Map<string, TaskGroup>()
    for (const it of tasks) {
      const key = it.area ? `area:${it.area.id}` : 'area:none'
      const g = map.get(key) ?? { key, label: it.area?.name ?? '—', patch: { areaId: it.area?.id ?? null }, items: [] }
      g.items.push(it)
      map.set(key, g)
    }
    return [...map.values()].sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''))
  }

  const map = new Map<string, TaskGroup>()
  for (const it of tasks) {
    const g = map.get(it.type.key) ?? { key: it.type.key, label: it.type.name, items: [] }
    g.items.push(it)
    map.set(it.type.key, g)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

const DATE_ORDER: Record<DateBucketKind, number> = { overdue: 0, today: 1, tomorrow: 2, day: 3, none: 4, done: 5 }

function groupByDate(tasks: TaskListItem[], opts: GroupOptions): TaskGroup[] {
  const today = toDateKey(opts.now ?? new Date())
  const tomorrow = addDaysKey(today, 1)
  const map = new Map<string, TaskGroup>()

  const bucket = (kind: DateBucketKind, dateKey?: string): TaskGroup => {
    const key = kind === 'day' ? `date:${dateKey}` : `date:${kind}`
    const existing = map.get(key)
    if (existing) return existing
    // Zaległe i zrobione nie przyjmują zadań z innych sekcji: brak jednej daty do zapisania.
    const patch: MovePatch | undefined =
      kind === 'today'
        ? { plannedDate: today }
        : kind === 'tomorrow'
          ? { plannedDate: tomorrow }
          : kind === 'day'
            ? { plannedDate: dateKey ?? null }
            : kind === 'none'
              ? { plannedDate: null }
              : undefined
    const g: TaskGroup = {
      key,
      label: null,
      date: { kind, dateKey },
      status: kind === 'done' ? 'done' : undefined,
      patch,
      items: []
    }
    map.set(key, g)
    return g
  }

  if (opts.ensureDateBuckets) {
    bucket('today', today)
    bucket('tomorrow', tomorrow)
    bucket('none')
  }

  for (const it of tasks) {
    const d = it.plannedDate
    if (isDone(it)) bucket('done').items.push(it)
    else if (!d) bucket('none').items.push(it)
    else if (d < today) bucket('overdue').items.push(it)
    else if (d === today) bucket('today', d).items.push(it)
    else if (d === tomorrow) bucket('tomorrow', d).items.push(it)
    else bucket('day', d).items.push(it)
  }

  return [...map.values()].sort((a, b) => {
    const ka = a.date?.kind ?? 'none'
    const kb = b.date?.kind ?? 'none'
    if (ka !== kb) return DATE_ORDER[ka] - DATE_ORDER[kb]
    return (a.date?.dateKey ?? '').localeCompare(b.date?.dateKey ?? '')
  })
}
