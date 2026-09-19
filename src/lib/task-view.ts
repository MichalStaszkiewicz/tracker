import { taskStatus } from '@shared/task-status'
import type { TaskListItem, TaskStatus } from '@shared/types'

export type GroupBy = 'status' | 'area' | 'type'

export interface TaskFilters {
  typeKey?: string
  tagId?: number
  query?: string
}

/** Zawężenie listy po typie, tagu i tekście — czyste, po stronie renderera. */
export function filterTasks(tasks: TaskListItem[], f: TaskFilters): TaskListItem[] {
  const q = f.query?.trim().toLowerCase()
  return tasks.filter((it) => {
    if (f.typeKey && it.type.key !== f.typeKey) return false
    if (f.tagId != null && !it.tags.some((t) => t.id === f.tagId)) return false
    if (q && !it.title.toLowerCase().includes(q)) return false
    return true
  })
}

export interface TaskGroup {
  key: string
  label: string | null // area/type: gotowa etykieta; status: null (ekran tłumaczy)
  status?: TaskStatus
  items: TaskListItem[]
}

const STATUS_ORDER: TaskStatus[] = ['in_progress', 'todo', 'done']

/** Grupowanie listy wg statusu, obszaru lub typu. */
export function groupTasks(tasks: TaskListItem[], groupBy: GroupBy): TaskGroup[] {
  if (groupBy === 'status') {
    const by: Record<TaskStatus, TaskListItem[]> = { in_progress: [], todo: [], done: [] }
    for (const it of tasks) by[taskStatus(it)].push(it)
    return STATUS_ORDER.filter((s) => by[s].length > 0).map((s) => ({
      key: s,
      label: null,
      status: s,
      items: by[s]
    }))
  }

  const map = new Map<string, { label: string; items: TaskListItem[] }>()
  for (const it of tasks) {
    const key = groupBy === 'area' ? it.area?.name ?? '—' : it.type.key
    const label = groupBy === 'area' ? it.area?.name ?? '—' : it.type.name
    const g = map.get(key) ?? { label, items: [] }
    g.items.push(it)
    map.set(key, g)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, g]) => ({ key, label: g.label, items: g.items }))
}
