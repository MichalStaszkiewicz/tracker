import { BrowserWindow, ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc'
import type { StatsPeriod, TaskFilter } from '@shared/types'
import { listAreas } from '@core/repositories/areas'
import { listBoardTypes, listTypes } from '@core/repositories/types'
import { listTags } from '@core/repositories/tags'
import {
  listBoard,
  listParentCandidates,
  listTasks,
  quickAdd,
  setStage,
  toggleDone
} from '@core/repositories/entries'
import { activeSession, startSession, stopSession } from '@core/repositories/sessions'
import { getStats } from '@core/repositories/stats'
import { getAllSettings, setSetting } from '@core/repositories/settings'
import { getDb, getDbPaths } from '../db'

/** Rejestruje handlery IPC — kanały 1:1 z kontraktem shared/ipc.ts. */
export function registerIpc(): void {
  ipcMain.handle(IPC.areasList, () => listAreas(getDb()))
  ipcMain.handle(IPC.typesList, () => listTypes(getDb()))
  ipcMain.handle(IPC.tagsList, () => listTags(getDb()))
  ipcMain.handle(IPC.entryParents, () => listParentCandidates(getDb()))
  ipcMain.handle(IPC.tasksList, (_e, filter: TaskFilter) => listTasks(getDb(), filter))
  ipcMain.handle(IPC.boardTypes, () => listBoardTypes(getDb()))
  ipcMain.handle(IPC.boardView, (_e, typeId: number) => listBoard(getDb(), typeId))
  ipcMain.handle(IPC.entryToggleDone, (_e, id: number) => toggleDone(getDb(), id))
  ipcMain.handle(IPC.entryQuickAdd, (_e, line: string) => quickAdd(getDb(), line))
  ipcMain.handle(IPC.entrySetStage, (_e, id: number, stageId: number) => setStage(getDb(), id, stageId))
  ipcMain.handle(IPC.sessionActive, () => activeSession(getDb()))
  ipcMain.handle(IPC.sessionStart, (_e, entryId: number | null) => startSession(getDb(), entryId))
  ipcMain.handle(IPC.sessionStop, () => stopSession(getDb()))

  ipcMain.handle(IPC.statsGet, (_e, period: StatsPeriod) => getStats(getDb(), period))

  ipcMain.handle(IPC.settingsGetAll, () => getAllSettings(getDb()))
  ipcMain.handle(IPC.settingsSet, (_e, key: string, value: unknown) => setSetting(getDb(), key, value))
  ipcMain.handle(IPC.dbPath, () => getDbPaths().dbPath)
  ipcMain.on(IPC.dbOpenFolder, () => {
    void shell.openPath(getDbPaths().dbDir)
  })
  ipcMain.on(IPC.externalOpen, (_e, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) void shell.openExternal(url)
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
