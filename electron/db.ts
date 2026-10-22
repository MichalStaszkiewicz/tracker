import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { Connection, DB } from '@core/db/connection'
import { openAppDb } from '@core/db/open'

export interface DbPaths {
  dbPath: string
  dbDir: string
  backupsDir: string
  /** Prywatne kopie robocze plików do przywrócenia (sprzątane przy starcie). */
  stagingDir: string
  /** Stan ostatniego eksportu — poza bazą, więc przywrócenie kopii go nie cofa. */
  statePath: string
  migrationsFolder: string
}

let conn: Connection | null = null
let paths: DbPaths | null = null

/** Inicjalizuje bazę: backup pliku → migracje → seed. Wiring Electron ↔ core. */
export function initDb(): DB {
  const dev = !app.isPackaged
  const dbDir = dev ? join(process.cwd(), 'data') : app.getPath('userData')
  mkdirSync(dbDir, { recursive: true })

  const dbPath = join(dbDir, dev ? 'dev.sqlite' : 'tracker.sqlite')
  const migrationsFolder = dev
    ? join(process.cwd(), 'core', 'db', 'migrations')
    : join(process.resourcesPath, 'migrations')
  const backupsDir = join(dbDir, 'backups')
  paths = {
    dbPath,
    dbDir,
    backupsDir,
    stagingDir: join(backupsDir, '.staging'),
    statePath: join(dbDir, 'backup-state.json'),
    migrationsFolder
  }

  conn = openAppDb({ dbPath, backupsDir, migrationsFolder })
  return conn.db
}

export function getConnection(): Connection {
  if (!conn) throw new Error('DB nie została zainicjalizowana')
  return conn
}

export function getDb(): DB {
  return getConnection().db
}

export function getDbPaths(): DbPaths {
  if (!paths) throw new Error('DB nie została zainicjalizowana')
  return paths
}

/** Zamknięcie przy wyjściu: checkpoint WAL, więc kopia startowa (sam plik główny) ma pełny stan. */
export function closeDb(): void {
  conn?.sqlite.close()
  conn = null
}
