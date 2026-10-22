import { existsSync } from 'node:fs'
import { startupBackupEnabled, writeStartupBackup } from '../backup/startup'
import { createDb, type Connection } from './connection'
import { runMigrations } from './migrate'
import { seed } from './seed'

export interface OpenAppDbOptions {
  dbPath: string
  backupsDir: string
  migrationsFolder: string
  now?: Date
}

/**
 * Baza aplikacji przy starcie: otwarcie → kopia startowa (jeśli plik istniał i ustawienie
 * `backup` jej nie wyłącza; zawsze przed migracjami) → migracje → seed.
 * Przy błędzie połączenie jest zamykane, a błąd leci dalej (migracje bez kopii się nie uruchamiają).
 */
export function openAppDb(opts: OpenAppDbOptions): Connection {
  const existed = existsSync(opts.dbPath)
  const conn = createDb(opts.dbPath)
  try {
    if (existed && startupBackupEnabled(conn)) {
      writeStartupBackup(conn, opts.dbPath, opts.backupsDir, opts.now ?? new Date())
    }
    runMigrations(conn.db, opts.migrationsFolder)
    seed(conn.db)
    return conn
  } catch (err) {
    conn.sqlite.close()
    throw err
  }
}
