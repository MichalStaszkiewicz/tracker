import { BrowserWindow, ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc'
import type {
  EntryPatch,
  ImportOffer,
  ImportPreview,
  MovePatch,
  MovePlacement,
  QuickAddContext,
  ScrapeCriteria,
  ScrapeSource,
  StatsPeriod,
  TaskFilter
} from '@shared/types'
import { createArea, listAreas } from '@core/repositories/areas'
import { listBoardTypes, listTypes } from '@core/repositories/types'
import { addTagToEntry, listTags, removeTagFromEntry } from '@core/repositories/tags'
import { addLink, removeLink, updateLink } from '@core/repositories/links'
import {
  getEntryDetail,
  listBoard,
  listParentCandidates,
  listTasks,
  moveEntry,
  quickAdd,
  searchEntries,
  setStage,
  setType,
  toggleDone,
  updateEntry
} from '@core/repositories/entries'
import { activeSession, startSession, stopSession } from '@core/repositories/sessions'
import { getStats } from '@core/repositories/stats'
import { commitImport, listOffers, previewImport } from '@core/repositories/offers'
import { fetchJustJoinOffers } from '@core/scraper/justjoin'
import { DEFAULT_JUSTJOIN_CRITERIA } from '@shared/scrapers/justjoin'
import { getAllSettings, setSetting } from '@core/repositories/settings'
import { getDb, getDbPaths } from '../db'

// Deduplikacja równoległych żądań scrapowania (np. podwójny efekt Reacta w StrictMode) —
// to samo źródło+kryteria zwraca ten sam bieg zamiast odpalać drugi komplet zapytań do serwisu.
const scrapeInFlight = new Map<string, Promise<ImportPreview>>()

/** Rejestruje handlery IPC — kanały 1:1 z kontraktem shared/ipc.ts. */
export function registerIpc(): void {
  ipcMain.handle(IPC.areasList, () => listAreas(getDb()))
  ipcMain.handle(IPC.areasCreate, (_e, name: string, color: string) => createArea(getDb(), name, color))
  ipcMain.handle(IPC.typesList, () => listTypes(getDb()))
  ipcMain.handle(IPC.tagsList, () => listTags(getDb()))
  ipcMain.handle(IPC.entryParents, () => listParentCandidates(getDb()))
  ipcMain.handle(IPC.entrySearch, (_e, q: string) => searchEntries(getDb(), q))
  ipcMain.handle(IPC.tasksList, (_e, filter: TaskFilter) => listTasks(getDb(), filter))
  ipcMain.handle(IPC.boardTypes, () => listBoardTypes(getDb()))
  ipcMain.handle(IPC.boardView, (_e, typeId: number) => listBoard(getDb(), typeId))
  ipcMain.handle(IPC.entryToggleDone, (_e, id: number) => toggleDone(getDb(), id))
  ipcMain.handle(IPC.entryQuickAdd, (_e, line: string, ctx?: QuickAddContext) =>
    quickAdd(getDb(), line, new Date(), ctx)
  )
  ipcMain.handle(IPC.entrySetStage, (_e, id: number, stageId: number) => setStage(getDb(), id, stageId))
  ipcMain.handle(IPC.entrySetType, (_e, id: number, typeId: number) => setType(getDb(), id, typeId))
  ipcMain.handle(
    IPC.entryMove,
    (_e, id: number, targetId: number, placement: MovePlacement, patch?: MovePatch) =>
      moveEntry(getDb(), id, targetId, placement, patch)
  )
  ipcMain.handle(IPC.entryDetail, (_e, id: number) => getEntryDetail(getDb(), id))
  ipcMain.handle(IPC.entryUpdate, (_e, id: number, patch: EntryPatch) => updateEntry(getDb(), id, patch))
  ipcMain.handle(IPC.entryAddTag, (_e, id: number, group: string, name: string) =>
    addTagToEntry(getDb(), id, group, name)
  )
  ipcMain.handle(IPC.entryRemoveTag, (_e, id: number, tagId: number) => removeTagFromEntry(getDb(), id, tagId))
  ipcMain.handle(IPC.linkAdd, (_e, id: number, kind: string, label: string, target: string) =>
    addLink(getDb(), id, kind, label, target)
  )
  ipcMain.handle(
    IPC.linkUpdate,
    (_e, linkId: number, patch: { kind?: string; label?: string; target?: string }) =>
      updateLink(getDb(), linkId, patch)
  )
  ipcMain.handle(IPC.linkRemove, (_e, linkId: number) => removeLink(getDb(), linkId))
  ipcMain.handle(IPC.sessionActive, () => activeSession(getDb()))
  ipcMain.handle(IPC.sessionStart, (_e, entryId: number | null) => startSession(getDb(), entryId))
  ipcMain.handle(IPC.sessionStop, () => stopSession(getDb()))

  ipcMain.handle(IPC.statsGet, (_e, period: StatsPeriod) => getStats(getDb(), period))

  ipcMain.handle(IPC.offersList, () => listOffers(getDb()))
  ipcMain.handle(IPC.offersPreview, (_e, offers: ImportOffer[]) => previewImport(getDb(), offers))
  ipcMain.handle(IPC.offersCommit, (_e, offers: ImportOffer[]) => commitImport(getDb(), offers))
  ipcMain.handle(IPC.offersScrape, (_e, source: ScrapeSource, criteria?: ScrapeCriteria) => {
    if (source !== 'justjoin') throw new Error(`Nieznane źródło ofert: ${source}`)
    const key = `${source}:${JSON.stringify(criteria ?? null)}`
    const existing = scrapeInFlight.get(key)
    if (existing) return existing
    const run = fetchJustJoinOffers(criteria ?? DEFAULT_JUSTJOIN_CRITERIA)
      .then((offers) => previewImport(getDb(), offers))
      .finally(() => scrapeInFlight.delete(key))
    scrapeInFlight.set(key, run)
    return run
  })

  ipcMain.handle(IPC.settingsGetAll, () => getAllSettings(getDb()))
  ipcMain.handle(IPC.settingsSet, (_e, key: string, value: unknown) => setSetting(getDb(), key, value))
  ipcMain.handle(IPC.dbPath, () => getDbPaths().dbPath)
  ipcMain.on(IPC.dbOpenFolder, () => {
    void shell.openPath(getDbPaths().dbDir)
  })
  ipcMain.on(IPC.externalOpen, (_e, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) void shell.openExternal(url)
  })
  ipcMain.on(IPC.openPath, (_e, path: string) => {
    if (typeof path === 'string' && path) void shell.openPath(path)
  })

  ipcMain.on(IPC.windowMinimize, (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on(IPC.windowMaximize, (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    if (!w) return
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
  })
  ipcMain.on(IPC.windowClose, (e) => BrowserWindow.fromWebContents(e.sender)?.close())
}
