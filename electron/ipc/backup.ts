import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { BACKUP_EXPORT_EXTENSION, BACKUP_IMPORT_EXTENSIONS, backupFileName } from '@shared/backup'
import { IPC } from '@shared/ipc'
import type { BackupDialogText, BackupErrorCode, BackupFailure } from '@shared/types'
import { createBackupController } from '@core/backup/controller'
import { BackupError, toBackupFailure } from '@core/backup/errors'
import { getConnection, getDbPaths } from '../db'

/** Tekst z renderera — tylko stringi (reszta → pusty, natywne okno ma własne domyślne). */
function label(text: unknown, key: keyof BackupDialogText): string {
  if (typeof text !== 'object' || text === null) return ''
  const v = (text as Record<string, unknown>)[key]
  return typeof v === 'string' ? v : ''
}

/** Okna dialogowe kopii + kontroler. Jedna operacja naraz; błędy znormalizowane do kodów. */
export function registerBackupIpc(): void {
  const paths = getDbPaths()
  const ctrl = createBackupController({
    live: getConnection,
    liveDbPath: paths.dbPath,
    backupsDir: paths.backupsDir,
    stagingDir: paths.stagingDir,
    statePath: paths.statePath,
    migrationsFolder: paths.migrationsFolder,
    appVersion: app.getVersion()
  })
  try {
    ctrl.sweep()
  } catch (err) {
    console.error('[backup] sprzątanie stagingu', err)
  }

  let busy = false
  const guarded = async <T>(fallback: BackupErrorCode, fn: () => Promise<T>): Promise<T | BackupFailure> => {
    if (busy) return { status: 'error', code: 'busy' }
    busy = true
    try {
      return await fn()
    } catch (err) {
      console.error('[backup]', err instanceof BackupError ? (err.cause ?? err.message) : err)
      return toBackupFailure(err, fallback)
    } finally {
      busy = false
    }
  }
  const windowOf = (e: IpcMainInvokeEvent): BrowserWindow | null => BrowserWindow.fromWebContents(e.sender)
  const startDir = (): string => ctrl.exportDir() ?? app.getPath('documents')

  ipcMain.handle(IPC.backupStatus, () => ctrl.status())

  ipcMain.handle(IPC.backupExport, (e, text: unknown) =>
    guarded('write-failed', async () => {
      const options: Electron.SaveDialogOptions = {
        title: label(text, 'title'),
        buttonLabel: label(text, 'buttonLabel'),
        defaultPath: join(startDir(), backupFileName(new Date())),
        filters: [{ name: label(text, 'filterName'), extensions: [BACKUP_EXPORT_EXTENSION] }]
      }
      const win = windowOf(e)
      const res = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
      if (res.canceled || !res.filePath) return { status: 'canceled' as const }
      return { status: 'saved' as const, export: ctrl.exportTo(res.filePath) }
    })
  )

  ipcMain.handle(IPC.backupPick, (e, text: unknown) =>
    guarded('read-failed', async () => {
      const options: Electron.OpenDialogOptions = {
        title: label(text, 'title'),
        buttonLabel: label(text, 'buttonLabel'),
        defaultPath: startDir(),
        properties: ['openFile'],
        filters: [
          { name: label(text, 'filterName'), extensions: [...BACKUP_IMPORT_EXTENSIONS] },
          { name: label(text, 'allFilesName'), extensions: ['*'] }
        ]
      }
      const win = windowOf(e)
      const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
      const picked = res.filePaths[0]
      if (res.canceled || !picked) return { status: 'canceled' as const }
      return { status: 'ready' as const, preview: ctrl.inspect(picked) }
    })
  )

  ipcMain.handle(IPC.backupRestore, (_e, token: unknown) =>
    guarded('restore-failed', async () => {
      if (typeof token !== 'string') throw new BackupError('expired')
      return { status: 'restored' as const, notice: ctrl.restore(token) }
    })
  )

  ipcMain.on(IPC.backupDiscard, (_e, token: unknown) => {
    if (typeof token === 'string') ctrl.discard(token)
  })
  ipcMain.on(IPC.backupDismissNotice, () => ctrl.dismissNotice())
}
