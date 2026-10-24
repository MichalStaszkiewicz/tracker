import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type DB = BetterSQLite3Database<typeof schema>

export interface Connection {
  db: DB
  sqlite: Database.Database
}

export interface DbOptions {
  /** false = zostaw tryb dziennika pliku (kopie zapasowe i staging nie przechodzą na WAL). */
  wal?: boolean
  /** false = FK wyłączone (migracje kopii, które mogą przebudowywać tabele-rodziców). */
  foreignKeys?: boolean
}

export function createDb(path: string, opts: DbOptions = {}): Connection {
  const sqlite = new Database(path)
  if (opts.wal !== false) sqlite.pragma('journal_mode = WAL')
  sqlite.pragma(`foreign_keys = ${opts.foreignKeys === false ? 'OFF' : 'ON'}`)
  const db = drizzle(sqlite, { schema })
  return { db, sqlite }
}
