import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { DB } from './connection'

/** Uruchamia oczekujące migracje. */
export function runMigrations(db: DB, migrationsFolder: string): void {
  migrate(db, { migrationsFolder })
}

/**
 * Kopia pliku bazy przed migracją (reguła: każda migracja z backupem).
 * Dla :memory: nie ma czego kopiować.
 */
export function backupDbFile(dbPath: string, backupsDir: string): void {
  if (dbPath === ':memory:' || !existsSync(dbPath)) return
  mkdirSync(backupsDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  copyFileSync(dbPath, join(backupsDir, `${basename(dbPath)}.${stamp}.bak`))
}
