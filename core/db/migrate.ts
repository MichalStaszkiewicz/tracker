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
