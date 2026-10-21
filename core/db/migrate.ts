import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import type { DB } from './connection'

/** Uruchamia oczekujące migracje. */
export function runMigrations(db: DB, migrationsFolder: string): void {
  migrate(db, { migrationsFolder })
}

/** Poziomy schematu aplikacji (journal "when" = created_at w __drizzle_migrations), rosnąco. */
export function migrationLevels(migrationsFolder: string): number[] {
  return readMigrationFiles({ migrationsFolder }).map((m) => m.folderMillis)
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
