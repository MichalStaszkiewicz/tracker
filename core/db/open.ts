import { createDb, type Connection } from './connection'
import { backupDbFile, runMigrations } from './migrate'
import { seed } from './seed'

export interface OpenAppDbOptions {
  dbPath: string
  backupsDir: string
  migrationsFolder: string
}

/** Baza aplikacji przy starcie: kopia startowa → migracje → seed. */
export function openAppDb(opts: OpenAppDbOptions): Connection {
  backupDbFile(opts.dbPath, opts.backupsDir)
  const conn = createDb(opts.dbPath)
  runMigrations(conn.db, opts.migrationsFolder)
  seed(conn.db)
  return conn
}
