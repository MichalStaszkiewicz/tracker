import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { createDb, type DB } from '@core/db/connection'
import { backupDbFile, runMigrations } from '@core/db/migrate'
import { seed } from '@core/db/seed'

let db: DB | null = null

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

  backupDbFile(dbPath, backupsDir)
  const conn = createDb(dbPath)
  runMigrations(conn.db, migrationsFolder)
  seed(conn.db)
  db = conn.db
  return db
}

export function getDb(): DB {
  if (!db) throw new Error('DB nie została zainicjalizowana')
  return db
}
