// Kontrakt IPC — jedyny szew między rendererem a danymi.
// Nazwy kanałów + kształt window.tracker. Implementacja: electron/ipc + electron/preload.

import type {
  Area,
  EntryType,
  ParentCandidate,
  SessionActive,
  Tag,
  TaskFilter,
  TaskListItem
} from './types'

export const IPC = {
  windowMinimize: 'window:minimize',
  windowMaximize: 'window:maximize',
  windowClose: 'window:close',

  areasList: 'areas:list',
  typesList: 'types:list',
  tagsList: 'tags:list',
  entryParents: 'entry:parents',

  tasksList: 'tasks:list',
  entryToggleDone: 'entry:toggleDone',
  entryQuickAdd: 'entry:quickAdd',

  sessionActive: 'session:active',
  sessionStart: 'session:start',
  sessionStop: 'session:stop',

  settingsGetAll: 'settings:getAll',
  settingsSet: 'settings:set',
  dbPath: 'system:dbPath',
  dbOpenFolder: 'system:openDbFolder'
} as const

// Powierzchnia dostępna w rendererze jako window.tracker.
export interface TrackerApi {
  window: {
    minimize(): void
    maximize(): void
    close(): void
  }
  areas: {
    list(): Promise<Area[]>
  }
  types: {
    list(): Promise<EntryType[]>
  }
  tags: {
    list(): Promise<Tag[]>
  }
  tasks: {
    list(filter: TaskFilter): Promise<TaskListItem[]>
  }
  entries: {
    toggleDone(id: number): Promise<TaskListItem>
    quickAdd(line: string): Promise<number>
    parents(): Promise<ParentCandidate[]>
  }
  sessions: {
    active(): Promise<SessionActive | null>
    start(entryId: number | null): Promise<SessionActive>
    stop(): Promise<void>
  }
  settings: {
    getAll(): Promise<Record<string, unknown>>
    set(key: string, value: unknown): Promise<void>
  }
  system: {
    dbPath(): Promise<string>
    openDbFolder(): void
  }
}

declare global {
  interface Window {
    tracker: TrackerApi
  }
}
