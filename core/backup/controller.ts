import { randomUUID } from 'node:crypto'
import { basename, dirname, join } from 'node:path'
import { snapshotFileName } from '@shared/backup'
import type { BackupStatus, LastExport, RestoreNotice, RestorePreview } from '@shared/types'
import type { Connection } from '../db/connection'
import { BackupError } from './errors'
import { isLiveDbFile, readLastExport, removeDbFiles, sweepDir, writeLastExport } from './files'
import { exportBackup, restoreStaged, stageBackup } from './service'

export interface BackupControllerDeps {
  live: () => Connection
  liveDbPath: string | null
  backupsDir: string
  stagingDir: string
  /** Plik stanu poza bazą (ostatni eksport) — przywrócenie kopii go nie cofa. */
  statePath: string
  migrationsFolder: string
  appVersion: string
  now?: () => Date
  newToken?: () => string
}

export interface BackupController {
  status(): BackupStatus
  /** Katalog ostatniego eksportu (domyślne miejsce okna dialogowego) albo null. */
  exportDir(): string | null
  exportTo(targetPath: string): LastExport
  /** Przygotowuje plik do przywrócenia; poprzedni niepotwierdzony podgląd jest porzucany. */
  inspect(sourcePath: string): RestorePreview
  /** Przywraca przygotowany plik — token jest jednorazowy. */
  restore(token: string): RestoreNotice
  discard(token: string): void
  dismissNotice(): void
  /** Sprzątanie pozostałości po przerwanych operacjach (przy starcie). */
  sweep(): void
}

/** Stan kopii zapasowej procesu głównego: jeden oczekujący podgląd i komunikat po przywróceniu. */
export function createBackupController(deps: BackupControllerDeps): BackupController {
  const now = deps.now ?? (() => new Date())
  const newToken = deps.newToken ?? (() => randomUUID())
  let pending: { token: string; stagedPath: string; preview: RestorePreview } | null = null
  let lastRestore: RestoreNotice | null = null

  const dispose = (): void => {
    if (!pending) return
    removeDbFiles(pending.stagedPath)
    pending = null
  }

  return {
    status: () => ({ lastExport: readLastExport(deps.statePath), lastRestore }),

    exportDir: () => {
      const last = readLastExport(deps.statePath)
      return last ? dirname(last.path) : null
    },

    exportTo: (targetPath) => {
      if (isLiveDbFile(targetPath, deps.liveDbPath)) throw new BackupError('is-live-db')
      const at = now()
      exportBackup(deps.live(), targetPath, { appVersion: deps.appVersion, now: at, kind: 'manual' })
      const last: LastExport = { at: at.toISOString(), path: targetPath }
      try {
        writeLastExport(deps.statePath, last)
      } catch {
        // kopia jest zapisana — brak zapamiętanego stanu nie jest błędem eksportu
      }
      return last
    },

    inspect: (sourcePath) => {
      dispose()
      const token = newToken()
      const staged = stageBackup(sourcePath, {
        live: deps.live(),
        liveDbPath: deps.liveDbPath,
        stagingDir: deps.stagingDir,
        migrationsFolder: deps.migrationsFolder,
        token
      })
      pending = { token, stagedPath: staged.stagedPath, preview: staged.preview }
      return staged.preview
    },

    restore: (token) => {
      if (!pending || pending.token !== token) throw new BackupError('expired')
      const job = pending
      pending = null // zużyty przed pracą: powtórzone żądanie nie przywróci drugi raz
      try {
        const at = now()
        const snapName = snapshotFileName(deps.liveDbPath ? basename(deps.liveDbPath) : 'tracker.sqlite', at)
        restoreStaged(deps.live(), job.stagedPath, {
          path: join(deps.backupsDir, snapName),
          meta: { appVersion: deps.appVersion, now: at, kind: 'pre-import' }
        })
        lastRestore = {
          restoredAt: at.toISOString(),
          fileName: job.preview.fileName,
          origin: job.preview.origin,
          takenAt: job.preview.takenAt,
          snapshotFileName: snapName,
          backupsDir: deps.backupsDir
        }
        return lastRestore
      } finally {
        removeDbFiles(job.stagedPath)
      }
    },

    discard: (token) => {
      if (pending?.token === token) dispose()
    },

    dismissNotice: () => {
      lastRestore = null
    },

    sweep: () => {
      sweepDir(deps.stagingDir)
      sweepDir(deps.backupsDir, (name) => name.endsWith('.partial'))
    }
  }
}
