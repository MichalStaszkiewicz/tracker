import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type Database from 'better-sqlite3'
import { createDb, type Connection } from './connection'
import { runMigrations } from './migrate'
import { listDataTables, type DataColumn } from '../repositories/backup'

export const MIGRATIONS_FOLDER = resolve('core/db/migrations')

/** Świeża baza w pamięci z uruchomionymi migracjami — do testów integracyjnych. */
export function makeTestDb(): Connection {
  const conn = createDb(':memory:')
  runMigrations(conn.db, MIGRATIONS_FOLDER)
  return conn
}

const BIG = 9007199254740993n // > Number.MAX_SAFE_INTEGER — kopia nie może zgubić precyzji

function affinity(type: string): 'integer' | 'text' | 'real' | 'blob' {
  const t = type.toUpperCase()
  if (t.includes('INT')) return 'integer'
  if (t.includes('CHAR') || t.includes('CLOB') || t.includes('TEXT')) return 'text'
  if (t === '' || t.includes('BLOB')) return 'blob'
  if (t.includes('REAL') || t.includes('FLOA') || t.includes('DOUB')) return 'real'
  return 'integer' // NUMERIC
}

function fillValue(table: string, col: DataColumn, i: number, fkCols: Set<string>): unknown {
  if (col.pk > 0 || fkCols.has(col.name)) {
    return affinity(col.type) === 'integer' ? i : `${table}.${col.name}#${i}`
  }
  if (!col.notNull && i === 2) return null
  switch (affinity(col.type)) {
    case 'integer':
      return i === 1 ? BIG : 0
    case 'real':
      return i === 1 ? 3.0 : 2.5
    case 'blob':
      return Buffer.from([0x00, 0xff, i])
    case 'text':
      return JSON.stringify(`zażółć 🚀 "${table}.${col.name}" ' #${i}`) // poprawny JSON, unikalny
  }
}

/**
 * Generyczny wypełniacz: 2 wiersze w KAŻDEJ tabeli danych (kolejność wg kluczy obcych).
 * pk / FK → 1, 2 (FK wskazuje wiersz i rodzica) · INTEGER → BIG / 0 · REAL → 3.0 / 2.5 · TEXT → JSON z
 * polskimi znakami, emoji i cudzysłowami · BLOB → bajty · kolumny NULL-owalne → NULL w wierszu 2
 * (sesja 2 trwa, wpis 1 jest w koszu). Na końcu sqlite_sequence > max(id).
 */
export function fillEveryTable(sqlite: Database.Database): void {
  const tables = listDataTables(sqlite)
  const parents = new Map<string, Array<{ table: string; from: string }>>()
  for (const t of tables) {
    parents.set(t.name, sqlite.prepare('SELECT "table", "from" FROM pragma_foreign_key_list(?)').all(t.name) as Array<{ table: string; from: string }>)
  }
  const done = new Set<string>()
  const ordered: typeof tables = []
  while (ordered.length < tables.length) {
    const next = tables.find((t) => !done.has(t.name) && parents.get(t.name)!.every((p) => p.table === t.name || done.has(p.table)))
    if (!next) throw new Error('cykl kluczy obcych w schemacie')
    ordered.push(next)
    done.add(next.name)
  }
  sqlite.transaction(() => {
    for (const t of ordered) {
      const fkCols = new Set(parents.get(t.name)!.map((p) => p.from))
      const cols = t.columns.map((c) => `"${c.name}"`).join(', ')
      const ph = t.columns.map(() => '?').join(', ')
      const insert = sqlite.prepare(`INSERT INTO "${t.name}" (${cols}) VALUES (${ph})`)
      for (const i of [1, 2]) insert.run(...t.columns.map((c) => fillValue(t.name, c, i, fkCols)))
    }
    sqlite.exec('UPDATE sqlite_sequence SET seq = seq + 10')
  })()
}

/** Tymczasowy folder migracji: prawdziwe *.sql + meta/_journal.json obcięty do pierwszych k wpisów. */
export function migrationsPrefixFolder(k: number, dir: string): string {
  mkdirSync(join(dir, 'meta'), { recursive: true })
  for (const f of readdirSync(MIGRATIONS_FOLDER)) {
    if (f.endsWith('.sql')) copyFileSync(join(MIGRATIONS_FOLDER, f), join(dir, f))
  }
  const journal = JSON.parse(readFileSync(join(MIGRATIONS_FOLDER, 'meta', '_journal.json'), 'utf8')) as {
    entries: unknown[]
  }
  writeFileSync(join(dir, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries: journal.entries.slice(0, k) }))
  return dir
}
