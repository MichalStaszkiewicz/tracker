// Kontrakt IPC — jedyny szew między rendererem a danymi.
// Nazwy kanałów + kształt window.tracker. Implementacja: electron/ipc + electron/preload.

import type {
  Area,
  BoardView,
  EntryDetail,
  EntryPatch,
  EntrySearchResult,
  EntryType,
  ImportOffer,
  ImportPreview,
  Link,
  OfferRow,
  ParentCandidate,
  SessionActive,
  StatsPeriod,
  StatsView,
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
  entrySearch: 'entry:search',

  tasksList: 'tasks:list',
  boardTypes: 'board:types',
  boardView: 'board:view',
  entryToggleDone: 'entry:toggleDone',
  entryQuickAdd: 'entry:quickAdd',
  entrySetStage: 'entry:setStage',
  entryDetail: 'entry:detail',
  entryUpdate: 'entry:update',
  entryAddTag: 'entry:addTag',
  entryRemoveTag: 'entry:removeTag',
  linkAdd: 'link:add',
  linkUpdate: 'link:update',
  linkRemove: 'link:remove',

  sessionActive: 'session:active',
  sessionStart: 'session:start',
  sessionStop: 'session:stop',

  statsGet: 'stats:get',

  offersList: 'offers:list',
  offersPreview: 'offers:preview',
  offersCommit: 'offers:commit',

  settingsGetAll: 'settings:getAll',
  settingsSet: 'settings:set',
  dbPath: 'system:dbPath',
  dbOpenFolder: 'system:openDbFolder',
  externalOpen: 'system:openExternal',
  openPath: 'system:openPath',
  paletteToggle: 'palette:toggle'
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
  board: {
    types(): Promise<EntryType[]>
    view(typeId: number): Promise<BoardView>
  }
  entries: {
    toggleDone(id: number): Promise<TaskListItem>
    quickAdd(line: string, ctx?: { areaId?: number | null }): Promise<number>
    parents(): Promise<ParentCandidate[]>
    search(q: string): Promise<EntrySearchResult[]>
    setStage(id: number, stageId: number): Promise<TaskListItem>
    detail(id: number): Promise<EntryDetail | null>
    update(id: number, patch: EntryPatch): Promise<EntryDetail>
    addTag(id: number, group: string, name: string): Promise<Tag>
    removeTag(id: number, tagId: number): Promise<void>
    addLink(id: number, kind: string, label: string, target: string): Promise<Link>
    updateLink(linkId: number, patch: { kind?: string; label?: string; target?: string }): Promise<void>
    removeLink(linkId: number): Promise<void>
  }
  sessions: {
    active(): Promise<SessionActive | null>
    start(entryId: number | null): Promise<SessionActive>
    stop(): Promise<void>
  }
  stats: {
    get(period: StatsPeriod): Promise<StatsView>
  }
  offers: {
    list(): Promise<OfferRow[]>
    preview(offers: ImportOffer[]): Promise<ImportPreview>
    commit(offers: ImportOffer[]): Promise<{ imported: number }>
  }
  settings: {
    getAll(): Promise<Record<string, unknown>>
    set(key: string, value: unknown): Promise<void>
  }
  system: {
    dbPath(): Promise<string>
    openDbFolder(): void
    openExternal(url: string): void
    openPath(path: string): void
    /** Skrót Ctrl+K przechwycony w procesie głównym; zwraca funkcję wyrejestrowującą. */
    onPaletteToggle(cb: () => void): () => void
  }
}

declare global {
  interface Window {
    tracker: TrackerApi
  }
}
