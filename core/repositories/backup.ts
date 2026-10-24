import { createHash } from 'node:crypto'
import type Database from 'better-sqlite3'
import { BackupError } from '../backup/errors'

// Cały SQL kopii zapasowej. Identyfikatory pochodzą wyłącznie z PRAGMA i są cytowane przez q().

export const BACKUP_META_TABLE = 'tracker_backup'
/** Tabele, których przywracanie nie kopiuje: historia migracji bazy na żywo i metadane pliku kopii. */
export const NON_DATA_TABLES: readonly string[] = ['__drizzle_migrations', BACKUP_META_TABLE]
export const SOURCE_SCHEMA = 'bak_src'
export type SchemaName = 'main' | typeof SOURCE_SCHEMA

export interface DataColumn {
  name: string
  type: string
  notNull: boolean
  pk: number
}
export interface DataTable {
  name: string
  columns: DataColumn[]
}
export interface SchemaOddities {
  triggers: string[]
  views: string[]
  virtualTables: string[]
  withoutRowid: string[]
}

const q = (name: string): string => `"${name.replace(/"/g, '""')}"`

/** Tabele danych użytkownika: wszystko poza sqlite_* i NON_DATA_TABLES, po nazwie; kolumny w kolejności cid. */
export function listDataTables(sqlite: Database.Database, schema: SchemaName = 'main'): DataTable[] {
  const names = sqlite
    .prepare("SELECT name FROM pragma_table_list WHERE schema = ? AND type = 'table' ORDER BY name")
    .pluck()
    .all(schema) as string[]
  return names
    .filter((n) => !n.startsWith('sqlite_') && !NON_DATA_TABLES.includes(n))
    .map((name) => {
      const cols = sqlite
        .prepare('SELECT name, type, "notnull" AS nn, pk FROM pragma_table_info(?, ?) ORDER BY cid')
        .all(name, schema) as Array<{ name: string; type: string; nn: number; pk: number }>
      return { name, columns: cols.map((c) => ({ name: c.name, type: c.type, notNull: c.nn === 1, pk: c.pk })) }
    })
}

/** Obiekty, których przywracanie tabel nie odtwarza — test-strażnik pilnuje, że ich nie ma. */
export function schemaOddities(sqlite: Database.Database): SchemaOddities {
  const master = (type: string): string[] =>
    sqlite.prepare('SELECT name FROM sqlite_master WHERE type = ? ORDER BY name').pluck().all(type) as string[]
  const list = sqlite.prepare("SELECT name, type, wr FROM pragma_table_list WHERE schema = 'main'").all() as Array<{
    name: string
    type: string
    wr: number
  }>
  return {
    triggers: master('trigger'),
    views: master('view'),
    virtualTables: list.filter((t) => t.type === 'virtual').map((t) => t.name),
    withoutRowid: list.filter((t) => t.wr === 1).map((t) => t.name)
  }
}

/** Spójny, zwarty zrzut bazy (z WAL) do nowego pliku. Plik docelowy nie może istnieć. */
export function vacuumInto(sqlite: Database.Database, path: string): void {
  sqlite.prepare('VACUUM INTO ?').run(path)
}

function hasTable(sqlite: Database.Database, name: string): boolean {
  return sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== undefined
}

export function writeBackupMeta(sqlite: Database.Database, meta: Record<string, string>): void {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS ${q(BACKUP_META_TABLE)} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`)
  const put = sqlite.prepare(`INSERT OR REPLACE INTO ${q(BACKUP_META_TABLE)} (key, value) VALUES (?, ?)`)
  sqlite.transaction(() => {
    for (const [k, v] of Object.entries(meta)) put.run(k, v)
  })()
}

/** null = plik bez tabeli metadanych (surowa baza, np. kopia startowa). */
export function readBackupMeta(sqlite: Database.Database): Record<string, string> | null {
  if (!hasTable(sqlite, BACKUP_META_TABLE)) return null
  const rows = sqlite.prepare(`SELECT key, value FROM ${q(BACKUP_META_TABLE)}`).all() as Array<{ key: unknown; value: unknown }>
  const out: Record<string, string> = {}
  for (const r of rows) out[String(r.key)] = String(r.value)
  return out
}

/** Poziomy schematu w kolejności zapisu (created_at = journal "when"); null = brak historii migracji. */
export function readMigrationLevels(sqlite: Database.Database): number[] | null {
  if (!hasTable(sqlite, '__drizzle_migrations')) return null
  const rows = sqlite.prepare('SELECT created_at FROM __drizzle_migrations ORDER BY rowid').pluck().all() as unknown[]
  return rows.map((v) => Number(v))
}

export function integrityOk(sqlite: Database.Database): boolean {
  return sqlite.pragma('integrity_check', { simple: true }) === 'ok'
}

export function foreignKeyViolations(sqlite: Database.Database, schema: SchemaName = 'main'): number {
  return (sqlite.pragma(`${schema}.foreign_key_check`) as unknown[]).length
}

/** `tabela.kolumna` każdej kolumny json z wartością (nie NULL), której json_valid nie przepuszcza. */
export function invalidJsonColumns(
  sqlite: Database.Database,
  cols: ReadonlyArray<{ table: string; column: string }>
): string[] {
  const bad: string[] = []
  for (const { table, column } of cols) {
    const hit = sqlite
      .prepare(`SELECT 1 FROM ${q(table)} WHERE ${q(column)} IS NOT NULL AND json_valid(${q(column)}) = 0 LIMIT 1`)
      .get()
    if (hit !== undefined) bad.push(`${table}.${column}`)
  }
  return bad
}

export function countRows(
  sqlite: Database.Database,
  tables: readonly DataTable[],
  schema: SchemaName = 'main'
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of tables) {
    out[t.name] = Number(sqlite.prepare(`SELECT COUNT(*) FROM ${schema}.${q(t.name)}`).pluck().get())
  }
  return out
}

/** sha256 po quote() każdej kolumny, wiersz po wierszu w kolejności rowid — rozróżnia 3 / 3.0 / '3' i NULL / ''. */
export function tableDigest(sqlite: Database.Database, table: DataTable, schema: SchemaName): string {
  const expr = table.columns.map((c) => `quote(${q(c.name)})`).join(" || ',' || ")
  const hash = createHash('sha256')
  for (const line of sqlite.prepare(`SELECT ${expr} FROM ${schema}.${q(table.name)} ORDER BY rowid`).pluck().iterate()) {
    hash.update(String(line))
    hash.update('\n')
  }
  return hash.digest('hex')
}

export function attachSource(sqlite: Database.Database, path: string): void {
  sqlite.prepare(`ATTACH DATABASE ? AS ${SOURCE_SCHEMA}`).run(path)
}

export function detachSource(sqlite: Database.Database): void {
  const dbs = sqlite.pragma('database_list') as Array<{ name: string }>
  if (dbs.some((d) => d.name === SOURCE_SCHEMA)) sqlite.exec(`DETACH DATABASE ${SOURCE_SCHEMA}`)
}

/**
 * Pełna zamiana danych main na dane z przyłączonej kopii (bak_src) w jednej transakcji IMMEDIATE:
 * najpierw wszystkie DELETE, potem INSERT…SELECT w kolejności rowid, sqlite_sequence dokładnie z kopii.
 * FK odroczone do COMMIT; przed COMMIT digest każdej tabeli main = bak_src i zero naruszeń FK —
 * inaczej wyjątek i ROLLBACK (baza na żywo bez zmian).
 */
export function replaceAllFrom(sqlite: Database.Database, tables: readonly DataTable[]): void {
  const names = tables.map((t) => t.name)
  const ph = names.map(() => '?').join(', ')
  const sourceHasSequence =
    sqlite.prepare(`SELECT 1 FROM ${SOURCE_SCHEMA}.sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'`).get() !==
    undefined
  sqlite
    .transaction(() => {
      sqlite.pragma('defer_foreign_keys = ON') // resetuje się samo przy COMMIT/ROLLBACK
      for (const t of tables) sqlite.prepare(`DELETE FROM main.${q(t.name)}`).run()
      for (const t of tables) {
        const cols = t.columns.map((c) => q(c.name)).join(', ')
        sqlite
          .prepare(`INSERT INTO main.${q(t.name)} (${cols}) SELECT ${cols} FROM ${SOURCE_SCHEMA}.${q(t.name)} ORDER BY rowid`)
          .run()
      }
      if (names.length > 0) {
        sqlite.prepare(`DELETE FROM main.sqlite_sequence WHERE name IN (${ph})`).run(...names)
        if (sourceHasSequence) {
          sqlite
            .prepare(
              `INSERT INTO main.sqlite_sequence (name, seq) SELECT name, seq FROM ${SOURCE_SCHEMA}.sqlite_sequence WHERE name IN (${ph})`
            )
            .run(...names)
        }
      }
      for (const t of tables) {
        if (tableDigest(sqlite, t, 'main') !== tableDigest(sqlite, t, SOURCE_SCHEMA)) {
          throw new BackupError('restore-failed', `digest:${t.name}`)
        }
      }
      const fk = foreignKeyViolations(sqlite, 'main')
      if (fk > 0) throw new BackupError('restore-failed', `fk:${fk}`)
    })
    .immediate()
}

/** Po przywróceniu sam plik główny ma pełny stan (bez zależności od -wal). */
export function checkpoint(sqlite: Database.Database): void {
  sqlite.pragma('wal_checkpoint(TRUNCATE)')
}
