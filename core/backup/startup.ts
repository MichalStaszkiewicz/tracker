import { mkdirSync, renameSync } from 'node:fs'
import { basename, join } from 'node:path'
import { startupBackupFileName } from '@shared/backup'
import { DEFAULT_SETTINGS } from '@shared/settings'
import type { Connection } from '../db/connection'
import { vacuumInto } from '../repositories/backup'
import { getSetting } from '../repositories/settings'
import { BackupError, fsFailureCode } from './errors'
import { removeDbFiles } from './files'

// Kopia pliku bazy przy starcie aplikacji (przed migracjami) — sterowana ustawieniem `backup`.

/** Ustawienie „Kopia zapasowa”: brak wpisu albo wartość nie-boolowska → domyślne (włączone). */
export function startupBackupEnabled(conn: Connection): boolean {
  let value: unknown
  try {
    value = getSetting(conn.db, 'backup')
  } catch {
    // Przed migracjami schemat może być starszy albo pusty — w razie wątpliwości kopia powstaje.
    return true
  }
  return typeof value === 'boolean' ? value : DEFAULT_SETTINGS.backup
}

/**
 * Spójna kopia bazy na żywo do `<baza>.<znacznik>.bak`: VACUUM INTO (z wierszami jeszcze w -wal,
 * także po nieczystym wyjściu) przez `.partial` + rename, więc przerwany zapis nie udaje kopii.
 */
export function writeStartupBackup(conn: Connection, dbPath: string, backupsDir: string, now: Date): string {
  const base = basename(dbPath)
  const target = join(backupsDir, startupBackupFileName(base, now))
  const tmp = `${target}.partial`
  try {
    mkdirSync(backupsDir, { recursive: true })
    removeDbFiles(tmp)
    vacuumInto(conn.sqlite, tmp)
    renameSync(tmp, target)
  } catch (err) {
    removeDbFiles(tmp)
    throw err instanceof BackupError ? err : new BackupError(fsFailureCode(err, 'write-failed'), 'startup', { cause: err })
  }
  return target
}
