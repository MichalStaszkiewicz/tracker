import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDb, type Connection } from '../db/connection'
import { jsonColumns } from '../db/schema-info'
import { fillEveryTable, makeTestDb } from '../db/test-utils'
import { BackupError } from '../backup/errors'
import {
  attachSource,
  countRows,
  detachSource,
  foreignKeyViolations,
  invalidJsonColumns,
  listDataTables,
  readBackupMeta,
  readMigrationLevels,
  replaceAllFrom,
  tableDigest,
  vacuumInto,
  writeBackupMeta,
  type DataTable
} from './backup'

let live: Connection
beforeEach(() => {
  live = makeTestDb()
})
afterEach(() => live.sqlite.close())

const digests = (c: Connection, schema: 'main' | 'bak_src' = 'main'): Record<string, string> =>
  Object.fromEntries(listDataTables(c.sqlite, schema).map((t) => [t.name, tableDigest(c.sqlite, t, schema)]))
const seqs = (c: Connection, schema = 'main'): Record<string, number> =>
  Object.fromEntries(
    (c.sqlite.prepare(`SELECT name, seq FROM ${schema}.sqlite_sequence ORDER BY name`).all() as Array<{ name: string; seq: number }>).map(
      (r) => [r.name, r.seq]
    )
  )

describe('listDataTables', () => {
  it('pomija sqlite_*, __drizzle_migrations i tracker_backup; kolumny z typem, pk, notnull', () => {
    writeBackupMeta(live.sqlite, { format: 'x' })
    const tables = listDataTables(live.sqlite)
    const names = tables.map((t) => t.name)
    expect(names).not.toContain('__drizzle_migrations')
    expect(names).not.toContain('tracker_backup')
    expect(names.some((n) => n.startsWith('sqlite_'))).toBe(false)
    expect([...names].sort()).toEqual(names)
    const sessions = tables.find((t) => t.name === 'sessions')!
    expect(sessions.columns.map((c) => c.name)).toEqual(['id', 'entry_id', 'started_at', 'ended_at', 'note', 'group_id'])
    expect(sessions.columns[0]).toEqual({ name: 'id', type: 'INTEGER', notNull: true, pk: 1 })
    expect(sessions.columns.find((c) => c.name === 'started_at')).toMatchObject({ type: 'TEXT', notNull: true, pk: 0 })
  })

  it('działa dla przyłączonej bazy (bak_src)', () => {
    attachSource(live.sqlite, ':memory:')
    expect(listDataTables(live.sqlite, 'bak_src')).toEqual([])
    detachSource(live.sqlite)
    detachSource(live.sqlite) // drugi raz nie rzuca
  })
})

describe('metadane i poziomy', () => {
  it('readMigrationLevels: w kolejności zapisu; brak tabeli → null', () => {
    const levels = readMigrationLevels(live.sqlite)!
    expect(levels.length).toBeGreaterThanOrEqual(2)
    expect([...levels].sort((a, b) => a - b)).toEqual(levels)
    live.sqlite.exec('DROP TABLE __drizzle_migrations')
    expect(readMigrationLevels(live.sqlite)).toBeNull()
  })

  it('writeBackupMeta / readBackupMeta: zapis, nadpisanie i odczyt; brak tabeli → null', () => {
    expect(readBackupMeta(live.sqlite)).toBeNull()
    writeBackupMeta(live.sqlite, { format: 'tracker-backup', formatVersion: '1' })
    writeBackupMeta(live.sqlite, { formatVersion: '2' })
    expect(readBackupMeta(live.sqlite)).toEqual({ format: 'tracker-backup', formatVersion: '2' })
  })
})

describe('kontrole spójności', () => {
  it('foreignKeyViolations liczy osierocone FK', () => {
    expect(foreignKeyViolations(live.sqlite)).toBe(0)
    live.sqlite.pragma('foreign_keys = OFF')
    live.sqlite.exec("INSERT INTO stages (type_id, name) VALUES (999, 'sierota')")
    expect(foreignKeyViolations(live.sqlite)).toBe(1)
  })

  it('invalidJsonColumns: tylko kolumny json, NULL dozwolony', () => {
    fillEveryTable(live.sqlite)
    expect(invalidJsonColumns(live.sqlite, jsonColumns())).toEqual([])
    live.sqlite.exec("UPDATE entries SET data = '{zepsute' WHERE id = 1")
    live.sqlite.exec('UPDATE retros SET extra = NULL')
    live.sqlite.exec("UPDATE links SET label = '{nie-json'") // links.label nie jest json — ignorowane
    expect(invalidJsonColumns(live.sqlite, jsonColumns())).toEqual(['entries.data'])
  })

  it('countRows liczy wiersze każdej tabeli', () => {
    fillEveryTable(live.sqlite)
    const counts = countRows(live.sqlite, listDataTables(live.sqlite))
    expect(Object.values(counts).every((n) => n === 2)).toBe(true)
  })
})

describe('tableDigest', () => {
  it("rozróżnia 3 / 3.0 / '3', '' / NULL i BLOB", () => {
    live.sqlite.exec('CREATE TABLE probe (v)')
    const t: DataTable = { name: 'probe', columns: [{ name: 'v', type: '', notNull: false, pk: 0 }] }
    const digestOf = (sqlValue: string): string => {
      live.sqlite.exec('DELETE FROM probe')
      live.sqlite.exec(`INSERT INTO probe (v) VALUES (${sqlValue})`)
      return tableDigest(live.sqlite, t, 'main')
    }
    const all = ['3', '3.0', "'3'", "''", 'NULL', "x'03'"].map(digestOf)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('replaceAllFrom', () => {
  let source: Connection
  let dir: string
  beforeEach(() => {
    source = makeTestDb()
    dir = mkdtempSync(join(tmpdir(), 'tracker-repo-backup-'))
  })
  afterEach(() => {
    source.sqlite.close()
    rmSync(dir, { recursive: true, force: true })
  })

  /** Zrzut źródła do pliku i przyłączenie go jako bak_src (tak jak robi to przywracanie). */
  const attachCopyOf = (src: Connection, tweak?: (copy: Connection) => void): void => {
    const path = join(dir, 'src.sqlite')
    vacuumInto(src.sqlite, path)
    if (tweak) {
      const copy = createDb(path, { wal: false, foreignKeys: false })
      tweak(copy)
      copy.sqlite.close()
    }
    attachSource(live.sqlite, path)
  }

  it('pełna zamiana zamiast scalania, id zachowane, sqlite_sequence dokładnie z kopii', () => {
    fillEveryTable(source.sqlite)
    live.sqlite.exec("INSERT INTO areas (name, color) VALUES ('A', 'x'), ('B', 'y'), ('C', 'z')")
    live.sqlite.exec("INSERT INTO settings (key, value) VALUES ('tylko-w-celu', '1')")
    attachCopyOf(source)
    replaceAllFrom(live.sqlite, listDataTables(live.sqlite))
    detachSource(live.sqlite)
    expect(digests(live)).toEqual(digests(source))
    expect(seqs(live)).toEqual(seqs(source))
    expect(live.sqlite.prepare("SELECT COUNT(*) FROM settings WHERE key = 'tylko-w-celu'").pluck().get()).toBe(0)
  })

  it('naruszenie FK przy COMMIT → wyjątek, baza bez zmian', () => {
    fillEveryTable(source.sqlite)
    live.sqlite.exec("INSERT INTO areas (name, color) VALUES ('A', 'x')")
    const before = digests(live)
    const seqBefore = seqs(live)
    attachCopyOf(source, (copy) => copy.sqlite.exec('UPDATE stages SET type_id = 999 WHERE id = 1'))
    expect(() => replaceAllFrom(live.sqlite, listDataTables(live.sqlite))).toThrow()
    detachSource(live.sqlite)
    expect(digests(live)).toEqual(before)
    expect(seqs(live)).toEqual(seqBefore)
  })

  it('różna afiniczność kolumny w kopii (digest się nie zgadza) → restore-failed i rollback', () => {
    fillEveryTable(source.sqlite)
    const before = digests(live)
    // w kopii kolumna note ma typ bez afiniczności — REAL 2.5 wpisany do TEXT na żywo zmieniłby się w '2.5'
    attachCopyOf(source, (copy) => {
      copy.sqlite.exec('ALTER TABLE sessions RENAME COLUMN note TO note_old')
      copy.sqlite.exec('ALTER TABLE sessions ADD COLUMN note')
      copy.sqlite.exec('UPDATE sessions SET note = 2.5')
    })
    let caught: unknown
    try {
      replaceAllFrom(live.sqlite, listDataTables(live.sqlite))
    } catch (err) {
      caught = err
    }
    detachSource(live.sqlite)
    expect(caught).toBeInstanceOf(BackupError)
    expect((caught as BackupError).code).toBe('restore-failed')
    expect((caught as BackupError).detail).toBe('digest:sessions')
    expect(digests(live)).toEqual(before)
  })
})
