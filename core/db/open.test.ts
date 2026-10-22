import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STARTUP_BACKUPS_KEEP, snapshotFileName, startupBackupFileName } from '@shared/backup'
import { BackupError } from '../backup/errors'
import { stageBackup } from '../backup/service'
import { readMigrationLevels } from '../repositories/backup'
import { getSetting, setSetting } from '../repositories/settings'
import { createDb, type Connection } from './connection'
import { migrationLevels, runMigrations } from './migrate'
import { openAppDb } from './open'
import { makeTestDb, MIGRATIONS_FOLDER, migrationsPrefixFolder } from './test-utils'

const NOW = new Date('2026-10-22T12:03:12.345Z')

let dir: string
let dbPath: string
let backupsDir: string
let open: Connection[]
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tracker-open-'))
  dbPath = join(dir, 'tracker.sqlite')
  backupsDir = join(dir, 'backups')
  open = []
})
afterEach(() => {
  // Windows: plik z otwartym połączeniem nie da się usunąć
  for (const c of open) if (c.sqlite.open) c.sqlite.close()
  rmSync(dir, { recursive: true, force: true })
})

const track = (c: Connection): Connection => {
  open.push(c)
  return c
}
const start = (now = NOW): Connection => track(openAppDb({ dbPath, backupsDir, migrationsFolder: MIGRATIONS_FOLDER, now }))
const reopen = (path: string): Connection => track(createDb(path, { wal: false, foreignKeys: false }))
const baks = (): string[] => (existsSync(backupsDir) ? readdirSync(backupsDir).sort() : [])
const areaNames = (c: Connection): unknown[] => c.sqlite.prepare('SELECT name FROM areas ORDER BY id').pluck().all()

/** Baza z poprzedniego uruchomienia, zamknięta czysto. `backup` pominięty = brak wpisu w settings. */
function existingDb(opts: { backup?: unknown; folder?: string } = {}): void {
  const c = createDb(dbPath)
  runMigrations(c.db, opts.folder ?? MIGRATIONS_FOLDER)
  if ('backup' in opts) setSetting(c.db, 'backup', opts.backup)
  c.sqlite.exec("INSERT INTO areas (name, color) VALUES ('z poprzedniego startu', 'x')")
  c.sqlite.close()
}

describe('openAppDb — ustawienie „Kopia zapasowa”', () => {
  it('nowy plik bazy → bez kopii; baza zmigrowana i zaseedowana', () => {
    const live = start()
    expect(baks()).toEqual([])
    expect(readMigrationLevels(live.sqlite)).toEqual(migrationLevels(MIGRATIONS_FOLDER))
    expect(getSetting(live.db, 'language')).toBeDefined()
  })

  it('backup = false → brak kopii startowej (regresja: ustawienie było ignorowane)', () => {
    existingDb({ backup: false })
    start()
    expect(baks()).toEqual([])
  })

  it('backup = true → jedna kopia <baza>.<znacznik ISO>.bak z danymi sprzed startu', () => {
    existingDb({ backup: true })
    start()
    expect(baks()).toEqual([startupBackupFileName('tracker.sqlite', NOW)])
    expect(areaNames(reopen(join(backupsDir, baks()[0])))).toEqual(['z poprzedniego startu'])
  })

  it.each([
    ['brak wpisu', {}],
    ['wartość nie-boolowska', { backup: 'nie' }]
  ])('%s → kopia (domyślnie włączone)', (_, opts) => {
    existingDb(opts)
    start()
    expect(baks()).toHaveLength(1)
  })

  it('plik bez tabeli settings (np. pusty) → kopia, start się udaje', () => {
    writeFileSync(dbPath, '')
    const live = start()
    expect(baks()).toHaveLength(1)
    expect(readMigrationLevels(live.sqlite)).toEqual(migrationLevels(MIGRATIONS_FOLDER))
  })
})

describe('openAppDb — spójność kopii startowej', () => {
  it('kopia powstaje przed migracjami — ma poziom schematu sprzed startu', () => {
    const levels = migrationLevels(MIGRATIONS_FOLDER)
    existingDb({ folder: migrationsPrefixFolder(1, join(dir, 'mig1')) })
    const live = start()
    expect(readMigrationLevels(live.sqlite)).toEqual(levels)
    expect(readMigrationLevels(reopen(join(backupsDir, baks()[0])).sqlite)).toEqual(levels.slice(0, 1))
  })

  it('po nieczystym wyjściu kopia zawiera wiersze, które są tylko w -wal', () => {
    const src = track(createDb(join(dir, 'src.sqlite')))
    runMigrations(src.db, MIGRATIONS_FOLDER)
    src.sqlite.pragma('wal_checkpoint(TRUNCATE)')
    src.sqlite.pragma('wal_autocheckpoint = 0')
    src.sqlite.exec("INSERT INTO areas (name, color) VALUES ('tylko-w-WAL', 'x')")
    // stan jak po awarii: plik główny bez wiersza + -wal z wierszem (bez checkpointu przy zamknięciu)
    copyFileSync(join(dir, 'src.sqlite'), dbPath)
    copyFileSync(join(dir, 'src.sqlite-wal'), `${dbPath}-wal`)
    start()
    const [bak] = baks()
    expect(existsSync(join(backupsDir, `${bak}-wal`))).toBe(false)
    expect(areaNames(reopen(join(backupsDir, bak)))).toEqual(['tylko-w-WAL'])
  })

  it('kopię startową z drugiego uruchomienia da się przywrócić jako surowe źródło (origin raw)', () => {
    start(new Date(NOW.getTime() - 60_000)).sqlite.close()
    const live = start()
    const typesNow = live.sqlite.prepare('SELECT COUNT(*) FROM entry_types').pluck().get()
    const { preview } = stageBackup(join(backupsDir, baks()[0]), {
      live: track(makeTestDb()),
      liveDbPath: dbPath,
      stagingDir: join(dir, 'staging'),
      migrationsFolder: MIGRATIONS_FOLDER,
      token: 'tok'
    })
    expect(preview.origin).toBe('raw')
    expect(preview.tables.find((t) => t.table === 'entry_types')?.incoming).toBe(typesNow)
  })

  it('nieudana kopia → BackupError, baza zamknięta i niezmigrowana', () => {
    existingDb({ folder: migrationsPrefixFolder(1, join(dir, 'mig1')) })
    writeFileSync(backupsDir, 'plik zamiast folderu')
    expect(() => start()).toThrow(BackupError)
    rmSync(backupsDir)
    // zamknięte połączenie → plik da się usunąć (Windows), a poziom schematu się nie zmienił
    const after = reopen(dbPath)
    expect(readMigrationLevels(after.sqlite)).toEqual(migrationLevels(MIGRATIONS_FOLDER).slice(0, 1))
  })
})

describe('openAppDb — retencja kopii startowych', () => {
  const at = (i: number): Date => new Date(NOW.getTime() - (i + 1) * 60_000)

  it(`zostaje ${STARTUP_BACKUPS_KEEP} najnowszych kopii startowych; kopie sprzed przywrócenia i obce pliki nietknięte`, () => {
    existingDb()
    mkdirSync(backupsDir)
    const old = Array.from({ length: STARTUP_BACKUPS_KEEP + 3 }, (_, i) => startupBackupFileName('tracker.sqlite', at(i)))
    const others = [
      snapshotFileName('tracker.sqlite', at(99)),
      startupBackupFileName('dev.sqlite', at(98)),
      `${startupBackupFileName('tracker.sqlite', at(97))}.partial`,
      'notatka.txt'
    ]
    for (const name of [...old, ...others]) writeFileSync(join(backupsDir, name), '')
    start()
    const kept = [startupBackupFileName('tracker.sqlite', NOW), ...old.slice(0, STARTUP_BACKUPS_KEEP - 1)]
    expect(baks()).toEqual([...kept, ...others].sort())
  })

  it('backup = false → stare kopie zostają (retencja tylko po nowej kopii)', () => {
    existingDb({ backup: false })
    mkdirSync(backupsDir)
    const old = Array.from({ length: STARTUP_BACKUPS_KEEP + 3 }, (_, i) => startupBackupFileName('tracker.sqlite', at(i)))
    for (const name of old) writeFileSync(join(backupsDir, name), '')
    start()
    expect(baks()).toEqual([...old].sort())
  })
})
