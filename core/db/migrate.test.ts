import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDb, type Connection } from './connection'
import { migrationLevels } from './migrate'
import { makeTestDb } from './test-utils'

const MIGRATIONS = resolve('core/db/migrations')
const open: Connection[] = []
const dirs: string[] = []
afterEach(() => {
  for (const c of open.splice(0)) c.sqlite.close()
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('migrationLevels', () => {
  it('folderMillis z journala rosnąco, równe created_at w __drizzle_migrations po runMigrations', () => {
    const levels = migrationLevels(MIGRATIONS)
    expect(levels.length).toBeGreaterThanOrEqual(2)
    expect([...levels].sort((a, b) => a - b)).toEqual(levels)
    const conn = makeTestDb()
    open.push(conn)
    const applied = conn.sqlite
      .prepare('SELECT created_at AS at FROM __drizzle_migrations ORDER BY created_at')
      .all() as Array<{ at: number }>
    expect(applied.map((r) => Number(r.at))).toEqual(levels)
  })
})

describe('createDb — opcje', () => {
  it('domyślnie WAL i FK włączone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tracker-db-'))
    dirs.push(dir)
    const conn = createDb(join(dir, 'a.sqlite'))
    open.push(conn)
    expect(conn.sqlite.pragma('journal_mode', { simple: true })).toBe('wal')
    expect(conn.sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
  })

  it('{ wal:false, foreignKeys:false }: nie zmienia journal_mode pliku, FK wyłączone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tracker-db-'))
    dirs.push(dir)
    const conn = createDb(join(dir, 'b.sqlite'), { wal: false, foreignKeys: false })
    open.push(conn)
    expect(conn.sqlite.pragma('journal_mode', { simple: true })).toBe('delete')
    expect(conn.sqlite.pragma('foreign_keys', { simple: true })).toBe(0)
  })
})
