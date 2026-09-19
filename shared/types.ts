// Jedno źródło prawdy dla typów domenowych i DTO. Izomorficzne, czyste.

export type Lang = 'pl' | 'en'

// --- Definicja typu wpisu (ENTRY_TYPE) ---

export type FieldType = 'text' | 'number' | 'bool' | 'select' | 'date' | 'url'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[] // tylko dla select
}

export type ProgressMode = 'children' | 'counter' | 'none'

// --- Encje ---

export interface Area {
  id: number
  name: string
  color: string
  position: number
}

export interface Stage {
  id: number
  typeId: number
  name: string
  position: number
  isDone: boolean
}

export interface EntryType {
  id: number
  key: string
  name: string
  icon: string
  fields: FieldDef[]
  progressMode: ProgressMode
  autoRetro: boolean
  showOnBoard: boolean
  template: string[]
  position: number
}

export interface Tag {
  id: number
  groupName: string
  name: string
  color: string | null
}

export interface Entry {
  id: number
  typeId: number
  parentId: number | null
  areaId: number | null
  stageId: number | null
  title: string
  descriptionMd: string | null
  data: Record<string, unknown>
  priority: number | null
  position: number
  plannedDate: string | null // YYYY-MM-DD
  dueDate: string | null // YYYY-MM-DD
  completedAt: string | null // ISO
  deletedAt: string | null // ISO
  createdAt: string // ISO
  updatedAt: string // ISO
}

export interface SessionActive {
  id: number
  entryId: number | null
  startedAt: string // ISO
}

/** Lekki kandydat na rodzica do podpowiedzi w szybkim dodawaniu. */
export interface ParentCandidate {
  id: number
  title: string
  icon: string
  areaColor: string | null
  subtitle: string | null
}

// --- DTO ekranu Zadania ---

export interface BoardView {
  stages: Stage[]
  cards: TaskListItem[]
}

export type StatsPeriod = 'week' | 'month' | 'year'

export interface StatsView {
  streakDays: number
  periodMinutes: number
  sessionCount: number
  avgSessionMinutes: number
  todayMinutes: number
  heatmap: { date: string; minutes: number }[]
  areaTime: { areaId: number | null; name: string; color: string | null; minutes: number }[]
  thresholdMinutes: number
}

export type TaskFilter = 'active' | 'today' | 'blocked' | 'done'
export type TaskStatus = 'in_progress' | 'todo' | 'done'

export interface TaskListItem {
  id: number
  title: string
  type: Pick<EntryType, 'key' | 'name' | 'icon' | 'progressMode'>
  area: Area | null
  parent: { id: number; title: string } | null
  stage: { id: number; name: string; isDone: boolean } | null
  tags: Tag[]
  priority: number | null
  plannedDate: string | null
  dueDate: string | null
  completedAt: string | null
  /** dla progressMode 'children' */
  childProgress: { done: number; total: number } | null
  /** dla progressMode 'counter' (z data.current / data.total) */
  counter: { current: number; total: number } | null
  secondsSpent: number
  activeSession: { startedAt: string } | null
}
