import { resolve } from 'node:path'
import { createDb, type Connection } from './connection'
import { runMigrations } from './migrate'

/** Świeża baza w pamięci z uruchomionymi migracjami — do testów integracyjnych. */
export function makeTestDb(): Connection {
  const conn = createDb(':memory:')
  runMigrations(conn.db, resolve('core/db/migrations'))
  return conn
}
