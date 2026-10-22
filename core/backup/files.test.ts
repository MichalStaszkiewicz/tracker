import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDb } from '../db/connection'
import {
  isLiveDbFile,
  readLastExport,
  readSqliteHeader,
  removeDbFiles,
  samePath,
  sweepDir,
  writeLastExport
} from './files'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tracker-files-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('readSqliteHeader', () => {
  it('magia, page_size i page_count z prawdziwej bazy', () => {
    const path = join(dir, 'a.sqlite')
    const conn = createDb(path, { wal: false })
    conn.sqlite.exec('CREATE TABLE t (x); INSERT INTO t VALUES (1)')
    const pageSize = conn.sqlite.pragma('page_size', { simple: true })
    const pageCount = conn.sqlite.pragma('page_count', { simple: true })
    conn.sqlite.close()
    expect(readSqliteHeader(path)).toEqual({ pageSize, pageCount })
  })

  it('page_size 1 = 65536; nieważny licznik stron → null', () => {
    const buf = Buffer.alloc(100)
    buf.write('SQLite format 3\0', 0, 'latin1')
    buf.writeUInt16BE(1, 16)
    buf.writeUInt32BE(7, 24) // change counter
    buf.writeUInt32BE(5, 28)
    buf.writeUInt32BE(6, 92) // version-valid-for ≠ change counter
    const path = join(dir, 'h.sqlite')
    writeFileSync(path, buf)
    expect(readSqliteHeader(path)).toEqual({ pageSize: 65536, pageCount: null })
  })

  it('śmieci, za krótki i pusty plik → null', () => {
    writeFileSync(join(dir, 'junk'), 'to nie jest baza danych, tylko tekst o długości ponad sto znaków '.repeat(3))
    writeFileSync(join(dir, 'short'), 'SQLite format 3\0')
    writeFileSync(join(dir, 'empty'), '')
    for (const f of ['junk', 'short', 'empty']) expect(readSqliteHeader(join(dir, f))).toBeNull()
  })
})

describe('samePath / isLiveDbFile', () => {
  it('normalizuje separatory i ..; na Windows ignoruje wielkość liter', () => {
    expect(samePath(join(dir, 'a', '..', 'b.sqlite'), join(dir, 'b.sqlite'))).toBe(true)
    expect(samePath(join(dir, 'b.sqlite'), join(dir, 'c.sqlite'))).toBe(false)
    if (process.platform === 'win32') expect(samePath(join(dir, 'B.SQLITE'), join(dir, 'b.sqlite'))).toBe(true)
  })

  it('-wal i -shm też są bazą na żywo; brak bazy na żywo → false', () => {
    const live = join(dir, 'tracker.sqlite')
    expect(isLiveDbFile(live, live)).toBe(true)
    expect(isLiveDbFile(`${live}-wal`, live)).toBe(true)
    expect(isLiveDbFile(`${live}-shm`, live)).toBe(true)
    expect(isLiveDbFile(join(dir, 'kopia.sqlite'), live)).toBe(false)
    expect(isLiveDbFile(live, null)).toBe(false)
  })
})

describe('removeDbFiles / sweepDir', () => {
  it('removeDbFiles usuwa plik z -wal/-shm/-journal; brak pliku nie rzuca', () => {
    const p = join(dir, 'x.sqlite')
    for (const s of ['', '-wal', '-shm', '-journal']) writeFileSync(p + s, 'x')
    removeDbFiles(p)
    expect(readdirSync(dir)).toEqual([])
    expect(() => removeDbFiles(p)).not.toThrow()
  })

  it('sweepDir czyści katalog (z filtrem); brak katalogu nie rzuca', () => {
    writeFileSync(join(dir, 'a.partial'), '')
    writeFileSync(join(dir, 'b.bak'), '')
    mkdirSync(join(dir, 'sub'))
    sweepDir(dir, (n) => n.endsWith('.partial'))
    expect(readdirSync(dir).sort()).toEqual(['b.bak', 'sub'])
    sweepDir(dir)
    expect(readdirSync(dir)).toEqual([])
    expect(() => sweepDir(join(dir, 'nie-ma'))).not.toThrow()
  })
})

describe('readLastExport / writeLastExport', () => {
  it('zapis atomowy (bez .tmp) i odczyt', () => {
    const state = join(dir, 'backup-state.json')
    const last = { at: '2026-10-21T12:03:12.345Z', path: 'C:\\Users\\Michał\\OneDrive\\kopia.sqlite' }
    writeLastExport(state, last)
    expect(readLastExport(state)).toEqual(last)
    expect(existsSync(`${state}.tmp`)).toBe(false)
  })

  it('brak pliku, śmieci albo zły kształt → null', () => {
    const state = join(dir, 'backup-state.json')
    expect(readLastExport(state)).toBeNull()
    writeFileSync(state, '{zepsute')
    expect(readLastExport(state)).toBeNull()
    writeFileSync(state, JSON.stringify({ lastExport: { at: 5, path: 'x' } }))
    expect(readLastExport(state)).toBeNull()
    writeFileSync(state, 'null')
    expect(readLastExport(state)).toBeNull()
  })
})
