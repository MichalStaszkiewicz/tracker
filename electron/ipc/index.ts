import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import type { TaskFilter } from '@shared/types'
import { listAreas } from '@core/repositories/areas'
import { listTypes } from '@core/repositories/types'
import { listTasks, quickAdd, toggleDone } from '@core/repositories/entries'
import { activeSession, startSession, stopSession } from '@core/repositories/sessions'
import { getDb } from '../db'

/** Rejestruje handlery IPC — kanały 1:1 z kontraktem shared/ipc.ts. */
export function registerIpc(): void {
  ipcMain.handle(IPC.areasList, () => listAreas(getDb()))
  ipcMain.handle(IPC.typesList, () => listTypes(getDb()))
  ipcMain.handle(IPC.tasksList, (_e, filter: TaskFilter) => listTasks(getDb(), filter))
  ipcMain.handle(IPC.entryToggleDone, (_e, id: number) => toggleDone(getDb(), id))
  ipcMain.handle(IPC.entryQuickAdd, (_e, line: string) => quickAdd(getDb(), line))
  ipcMain.handle(IPC.sessionActive, () => activeSession(getDb()))
  ipcMain.handle(IPC.sessionStart, (_e, entryId: number | null) => startSession(getDb(), entryId))
  ipcMain.handle(IPC.sessionStop, () => stopSession(getDb()))

  ipcMain.on(IPC.windowMinimize, (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on(IPC.windowMaximize, (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    if (!w) return
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
  })
  ipcMain.on(IPC.windowClose, (e) => BrowserWindow.fromWebContents(e.sender)?.close())
}
