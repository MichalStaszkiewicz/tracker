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
  startedAt: string // ISO — start bieżącego odcinka
  /** Sesja = grupa odcinków (pauza/wznowienie); id grupy = id pierwszego odcinka. */
  groupId: number
  /** Sekundy z zamkniętych odcinków tej samej sesji (licznik = to + bieżący odcinek). */
  carriedSeconds: number
  /** Tytuł zadania i kolor obszaru — widżet sesji działa na każdym ekranie, bez listy zadań. */
  entryTitle: string | null
  areaColor: string | null
}

/** Wstrzymana sesja: wszystkie odcinki zamknięte, można ją wznowić (ten sam groupId). */
export interface PausedSession {
  groupId: number
  entryId: number | null
  entryTitle: string | null
  areaColor: string | null
  carriedSeconds: number
}

export interface Link {
  id: number
  entryId: number
  kind: string // url | file | folder | repo
  label: string
  target: string
}

/** Pełny wpis do widoku szczegółów. */
export interface EntryDetail {
  id: number
  type: EntryType
  title: string
  descriptionMd: string
  data: Record<string, unknown>
  area: Area | null
  stage: { id: number; name: string; isDone: boolean } | null
  stages: Stage[]
  tags: Tag[]
  links: Link[]
  priority: number | null
  plannedDate: string | null
  dueDate: string | null
  secondsSpent: number
  children: TaskListItem[]
}

/** Grupowanie listy zadań. */
export type TaskGroupBy = 'status' | 'area' | 'type' | 'date'
export const TASK_GROUP_BYS: readonly TaskGroupBy[] = ['date', 'status', 'area', 'type']

/** Kontekst widoku przy szybkim dodawaniu: otwarty obszar, data filtru „Dziś". Jawne `@` wygrywa. */
export interface QuickAddContext {
  areaId?: number | null
  plannedDate?: string
}

/** Gdzie upuścić przenoszony wpis względem celu na liście. */
export type MovePlacement = 'before' | 'after'

/** Pola, które upuszczenie w innej sekcji listy może zmienić razem z pozycją (atomowo). */
export interface MovePatch {
  plannedDate?: string | null
  areaId?: number | null
}

export interface EntryPatch {
  title?: string
  descriptionMd?: string | null
  data?: Record<string, unknown>
  areaId?: number | null
  priority?: number | null
  plannedDate?: string | null
  dueDate?: string | null
}

/** Wynik wyszukiwania w palecie poleceń. */
export interface EntrySearchResult {
  id: number
  title: string
  icon: string
  areaColor: string | null
  subtitle: string
}

/** Wiersz tabeli ofert (wpis typu offer, spłaszczony do wyświetlenia). */
export interface OfferRow {
  id: number
  company: string
  position: string
  salary: string
  workMode: string
  location: string
  source: string
  url: string
  createdAt: string
}

/** Oferta z importu (po zmapowaniu kolumn CSV). */
export interface ImportOffer {
  company?: string
  position?: string
  salary?: string
  workMode?: string
  location?: string
  url?: string
}

export interface ImportPreview {
  newItems: ImportOffer[]
  duplicates: ImportOffer[]
  errors: { offer: ImportOffer; reason: string }[]
}

/** Źródło scrapowania ofert. Zachowanie per-źródło mieszka w scraperach, nie w if-ach. */
export type ScrapeSource = 'justjoin'

/** Kryteria pobierania ofert ze źródła (kategorie serwisu + filtr po słowach kluczowych). */
export interface ScrapeCriteria {
  categories: string[]
  keywords: string[]
  experienceLevels?: string[]
  /** Ile ofert maksymalnie przejrzeć na kategorię (przed filtrem słów kluczowych). */
  maxPerCategory?: number
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
