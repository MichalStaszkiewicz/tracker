import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Connection } from '../db/connection'
import { seed, seedDemo } from '../db/seed'
import { fillEveryTable, makeTestDb, MIGRATIONS_FOLDER } from '../db/test-utils'
import { exportBackup } from './service'
import { createBackupController, type BackupControllerDeps } from './controller'

const T0 = new Date('2026-10-21T12:00:00.000Z')

let dir: string
let live: Connection
let source: Connection
let tokens: number
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tracker-ctrl-'))
  live = makeTestDb()
  seedDemo(live.db, T0)
  source = makeTestDb()
  fillEveryTable(source.sqlite)
  tokens = 0
})
afterEach(() => {
  live.sqlite.close()
  source.sqlite.close()
  rmSync(dir, { recursive: true, force: true })
})

const deps = (extra: Partial<BackupControllerDeps> = {}): BackupControllerDeps => ({
  live: () => live,
  liveDbPath: join(dir, 'tracker.sqlite'),
  backupsDir: join(dir, 'backups'),
  stagingDir: join(dir, 'backups', '.staging'),
  statePath: join(dir, 'backup-state.json'),
  migrationsFolder: MIGRATIONS_FOLDER,
  appVersion: '1.6.0',
  now: () => T0,
  newToken: () => `t${++tokens}`,
  ...extra
})
const backupFile = (name = 'kopia.sqlite'): string => {
  const file = join(dir, name)
  exportBackup(source, file, { appVersion: '1.5.0', now: T0, kind: 'manual' })
  return file
}
const staging = (): string[] => (existsSync(join(dir, 'backups', '.staging')) ? readdirSync(join(dir, 'backups', '.staging')) : [])
const areas = (): number => Number(live.sqlite.prepare('SELECT COUNT(*) FROM areas').pluck().get())

describe('backup controller', () => {
  it('inspect → restore(token): token jednorazowy, drugi restore → expired, staging usunięty', () => {
    const ctrl = createBackupController(deps())
    const preview = ctrl.inspect(backupFile())
    expect(preview.token).toBe('t1')
    expect(staging()).toHaveLength(1)
    const notice = ctrl.restore('t1')
    expect(notice).toMatchObject({ fileName: 'kopia.sqlite', origin: 'export', takenAt: T0.toISOString() })
    expect(notice.snapshotFileName).toMatch(/^tracker\.sqlite\.pre-import\..+\.bak$/)
    expect(existsSync(join(dir, 'backups', notice.snapshotFileName))).toBe(true)
    expect(areas()).toBe(2)
    expect(staging()).toEqual([])
    expect(() => ctrl.restore('t1')).toThrow(expect.objectContaining({ code: 'expired' }))
  })

  it('nowy inspect unieważnia poprzedni token i usuwa jego staging', () => {
    const ctrl = createBackupController(deps())
    ctrl.inspect(backupFile('a.sqlite'))
    ctrl.inspect(backupFile('b.sqlite'))
    expect(staging()).toEqual(['t2.sqlite'])
    expect(() => ctrl.restore('t1')).toThrow(expect.objectContaining({ code: 'expired' }))
    expect(areas()).toBe(4) // nic nie przywrócono
  })

  it('discard usuwa staging; nieznany token ignorowany', () => {
    const ctrl = createBackupController(deps())
    ctrl.inspect(backupFile())
    ctrl.discard('obcy')
    expect(staging()).toHaveLength(1)
    ctrl.discard('t1')
    expect(staging()).toEqual([])
    expect(() => ctrl.restore('t1')).toThrow(expect.objectContaining({ code: 'expired' }))
  })

  it('nieudany inspect nie zostawia oczekującego podglądu', () => {
    const ctrl = createBackupController(deps())
    ctrl.inspect(backupFile())
    const junk = join(dir, 'junk.sqlite')
    writeFileSync(junk, 'x'.repeat(200))
    expect(() => ctrl.inspect(junk)).toThrow(expect.objectContaining({ code: 'not-sqlite' }))
    expect(() => ctrl.restore('t1')).toThrow(expect.objectContaining({ code: 'expired' }))
    expect(staging()).toEqual([])
  })

  it('status: lastExport przeżywa nową instancję (plik stanu) i nie cofa go restore; lastRestore tylko w pamięci', () => {
    const ctrl = createBackupController(deps())
    expect(ctrl.status()).toEqual({ lastExport: null, lastRestore: null })
    const target = join(dir, 'eksport', 'moja.sqlite')
    mkdirSync(join(dir, 'eksport'))
    const last = ctrl.exportTo(target)
    expect(last).toEqual({ at: T0.toISOString(), path: target })
    expect(createBackupController(deps()).status().lastExport).toEqual(last)

    ctrl.inspect(backupFile())
    const notice = ctrl.restore('t1')
    expect(ctrl.status()).toEqual({ lastExport: last, lastRestore: notice })
    expect(ctrl.status().lastRestore).toEqual(notice) // odczyt nie konsumuje (StrictMode)
    expect(createBackupController(deps()).status().lastRestore).toBeNull()
    ctrl.dismissNotice()
    expect(ctrl.status().lastRestore).toBeNull()
  })

  it('exportTo pliku bazy na żywo → is-live-db; exportDir = katalog ostatniego eksportu albo null', () => {
    const ctrl = createBackupController(deps())
    expect(ctrl.exportDir()).toBeNull()
    expect(() => ctrl.exportTo(join(dir, 'tracker.sqlite'))).toThrow(expect.objectContaining({ code: 'is-live-db' }))
    ctrl.exportTo(join(dir, 'out.sqlite'))
    expect(ctrl.exportDir()).toBe(dir)
  })

  it('podgląd: trwające sesje na żywo i liczby dla każdej tabeli', () => {
    const ctrl = createBackupController(deps())
    const preview = ctrl.inspect(backupFile())
    expect(preview.liveOpenSessions).toBe(1)
    expect(preview.tables.find((t) => t.table === 'areas')).toEqual({ table: 'areas', current: 4, incoming: 2 })
  })

  it('sweep: usuwa pozostałości stagingu i pliki .partial w backups', () => {
    mkdirSync(join(dir, 'backups', '.staging'), { recursive: true })
    writeFileSync(join(dir, 'backups', '.staging', 'stary.sqlite'), '')
    writeFileSync(join(dir, 'backups', 'tracker.sqlite.pre-import.x.bak.partial'), '')
    writeFileSync(join(dir, 'backups', 'tracker.sqlite.2026.bak'), '')
    createBackupController(deps()).sweep()
    expect(staging()).toEqual([])
    expect(readdirSync(join(dir, 'backups')).sort()).toEqual(['.staging', 'tracker.sqlite.2026.bak'])
  })

  it('bez ścieżki bazy na żywo kopia poprzedniego stanu nazywa się tracker.sqlite…', () => {
    seed(live.db)
    const ctrl = createBackupController(deps({ liveDbPath: null }))
    ctrl.inspect(backupFile())
    expect(ctrl.restore('t1').snapshotFileName).toMatch(/^tracker\.sqlite\.pre-import\./)
  })
})
