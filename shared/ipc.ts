// Kontrakt IPC — jedyny szew między rendererem a danymi.
// Nazwy kanałów + kształt window.tracker. Implementacja: electron/ipc + electron/preload.

import type { Area, EntryType, SessionActive, TaskFilter, TaskListItem } from './types'

export const IPC = {
  windowMinimize: 'window:minimize',
  windowMaximize: 'window:maximize',
  windowClose: 'window:close',

  areasList: 'areas:list',
  typesList: 'types:list',

  tasksList: 'tasks:list',
  entryToggleDone: 'entry:toggleDone',
  entryQuickAdd: 'entry:quickAdd',

  sessionActive: 'session:active',
  sessionStart: 'session:start',
  sessionStop: 'session:stop'
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
  tasks: {
    list(filter: TaskFilter): Promise<TaskListItem[]>
  }
  entries: {
    toggleDone(id: number): Promise<TaskListItem>
    quickAdd(line: string): Promise<number>
  }
  sessions: {
    active(): Promise<SessionActive | null>
    start(entryId: number | null): Promise<SessionActive>
    stop(): Promise<void>
  }
}

declare global {
  interface Window {
    tracker: TrackerApi
  }
}
