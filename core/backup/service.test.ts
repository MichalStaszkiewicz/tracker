import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, truncateSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDb, type Connection } from '../db/connection'
import { migrationLevels, runMigrations } from '../db/migrate'
import { seed, seedDemo } from '../db/seed'
import { fillEveryTable, makeTestDb, MIGRATIONS_FOLDER, migrationsPrefixFolder } from '../db/test-utils'
import { listDataTables, readBackupMeta, tableDigest, type DataTable } from '../repositories/backup'
import { openSessionCount, startSession, stopSession } from '../repositories/sessions'
import { BackupError } from './errors'
import { exportBackup, firstStructureDiff, restoreStaged, stageBackup, type StageContext } from './service'

const NOW = new Date('2026-10-21T12:03:12.345Z')
const LATER = new Date('2026-10-21T13:00:00.000Z')

let dir: string
let open: Connection[]
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tracker-service-'))
  open = []
})
afterEach(() => {
  for (const c of open) if (c.sqlite.open) c.sqlite.close()
  rmSync(dir, { recursive: true, force: true })
})

const track = (c: Connection): Connection => {
  open.push(c)
  return c
}
const memDb = (): Connection => track(makeTestDb())
const fileDb = (path: string, folder = MIGRATIONS_FOLDER): Connection => {
  const c = track(createDb(path))
  runMigrations(c.db, folder)
  return c
}
const reopen = (path: string): Connection => track(createDb(path, { wal: false, foreignKeys: false }))
const meta = (now = NOW, kind: 'manual' | 'pre-import' = 'manual') => ({ appVersion: '1.6.0', now, kind })
const stagingDir = (): string => join(dir, 'staging')
const ctx = (live: Connection, token = 'tok', extra: Partial<StageContext> = {}): StageContext => ({
  live,
  liveDbPath: null,
  stagingDir: stagingDir(),
  migrationsFolder: MIGRATIONS_FOLDER,
  token,
  ...extra
})
const digests = (c: Connection): Record<string, string> =>
  Object.fromEntries(listDataTables(c.sqlite).map((t) => [t.name, tableDigest(c.sqlite, t, 'main')]))
const seqs = (c: Connection): Record<string, number> =>
  Object.fromEntries(
    (c.sqlite.prepare('SELECT name, seq FROM sqlite_sequence ORDER BY name').all() as Array<{ name: string; seq: number }>).map(
      (r) => [r.name, r.seq]
    )
  )
const sha = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex')
const snapshotAt = (name = 'snap.bak'): { path: string; meta: ReturnType<typeof meta> } => ({
  path: join(dir, 'backups', name),
  meta: meta(LATER, 'pre-import')
})
const stagingEmpty = (): boolean => !existsSync(stagingDir()) || readdirSync(stagingDir()).length === 0

/** Źródło z wypełnioną każdą tabelą, wyeksportowane do pliku. */
function exportedFill(name = 'kopia.sqlite'): { source: Connection; file: string } {
  const source = memDb()
  fillEveryTable(source.sqlite)
  const file = join(dir, name)
  exportBackup(source, file, meta())
  return { source, file }
}

describe('exportBackup', () => {
  it('plik bez -wal, journal_mode=delete, integrity ok, metadane; baza na żywo bez zmian', () => {
    const live = fileDb(join(dir, 'live.sqlite'))
    seedDemo(live.db, NOW)
    const before = digests(live)
    const file = join(dir, 'out.sqlite')
    exportBackup(live, file, meta())
    expect(existsSync(`${file}-wal`)).toBe(false)
    expect(existsSync(`${file}.partial`)).toBe(false)
    const copy = reopen(file)
    expect(copy.sqlite.pragma('journal_mode', { simple: true })).toBe('delete')
    expect(copy.sqlite.pragma('integrity_check', { simple: true })).toBe('ok')
    expect(readBackupMeta(copy.sqlite)).toEqual({
      format: 'tracker-backup',
      formatVersion: '1',
      kind: 'manual',
      exportedAt: NOW.toISOString(),
      appVersion: '1.6.0'
    })
    expect(digests(live)).toEqual(before)
  })

  it('zawiera wiersze jeszcze niezcheckpointowane z WAL', () => {
    const live = fileDb(join(dir, 'live.sqlite'))
    live.sqlite.pragma('wal_autocheckpoint = 0')
    live.sqlite.exec("INSERT INTO areas (name, color) VALUES ('tylko-w-WAL', 'x')")
    expect(statSync(join(dir, 'live.sqlite-wal')).size).toBeGreaterThan(0)
    const file = join(dir, 'out.sqlite')
    exportBackup(live, file, meta())
    const copy = reopen(file)
    expect(copy.sqlite.prepare('SELECT name FROM areas').pluck().all()).toEqual(['tylko-w-WAL'])
  })

  it('zamyka trwającą sesję tylko w kopii (w bazie na żywo dalej trwa)', () => {
    const live = memDb()
    seedDemo(live.db, NOW) // seed zostawia jedną trwającą sesję
    expect(openSessionCount(live.db)).toBe(1)
    const file = join(dir, 'out.sqlite')
    exportBackup(live, file, meta(LATER))
    expect(openSessionCount(live.db)).toBe(1)
    const copy = reopen(file)
    expect(openSessionCount(copy.db)).toBe(0)
    expect(copy.sqlite.prepare('SELECT COUNT(*) FROM sessions WHERE ended_at = ?').pluck().get(LATER.toISOString())).toBe(1)
  })

  it("nadpisuje istniejący plik atomowo, nie zostawia .partial; ścieżka z apostrofem i polskimi znakami", () => {
    const live = memDb()
    seed(live.db)
    const sub = join(dir, "Michał O'Brien — kopie")
    mkdirSync(sub)
    const file = join(sub, 'zażółć.sqlite')
    writeFileSync(file, 'stary plik')
    exportBackup(live, file, meta())
    expect(readdirSync(sub)).toEqual(['zażółć.sqlite'])
    expect(readBackupMeta(reopen(file).sqlite)?.format).toBe('tracker-backup')
  })

  it('zapis do nieistniejącego katalogu → BackupError, bez .partial', () => {
    const live = memDb()
    const file = join(dir, 'nie-ma', 'out.sqlite')
    let caught: unknown
    try {
      exportBackup(live, file, meta())
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(BackupError)
    expect(['no-access', 'write-failed']).toContain((caught as BackupError).code)
    expect(existsSync(join(dir, 'nie-ma'))).toBe(false)
  })
})

describe('round-trip eksport → stage → restore', () => {
  it('KAŻDA tabela danych identyczna co do bajtu; jedyna różnica: otwarte sesje zamknięte na exportedAt', () => {
    const { source, file } = exportedFill()
    const live = memDb()
    seedDemo(live.db, NOW) // inne dane w celu — mają zniknąć
    const staged = stageBackup(file, ctx(live))
    restoreStaged(live, staged.stagedPath, snapshotAt())
    stopSession(source.db, NOW) // to samo, co eksport zrobił w kopii
    expect(digests(live)).toEqual(digests(source))
  })

  it('sqlite_sequence z kopii (seq > max(id)); następne id = seq + 1', () => {
    const { source, file } = exportedFill()
    const live = memDb()
    seedDemo(live.db, NOW)
    restoreStaged(live, stageBackup(file, ctx(live)).stagedPath, snapshotAt())
    expect(seqs(live)).toEqual(seqs(source))
    const next = live.sqlite.prepare("INSERT INTO areas (name, color) VALUES ('n', 'c') RETURNING id").pluck().get()
    expect(next).toBe(seqs(source).areas + 1)
  })

  it('zastępuje, nie scala: dodatkowe wiersze celu znikają; drugi import tej samej kopii idempotentny', () => {
    const { file } = exportedFill()
    const live = memDb()
    seedDemo(live.db, NOW)
    restoreStaged(live, stageBackup(file, ctx(live, 'a')).stagedPath, snapshotAt('a.bak'))
    const once = digests(live)
    const again = stageBackup(file, ctx(live, 'b'))
    expect(again.preview.tables.every((t) => t.current === t.incoming)).toBe(true)
    restoreStaged(live, again.stagedPath, snapshotAt('b.bak'))
    expect(digests(live)).toEqual(once)
    expect(live.sqlite.prepare("SELECT COUNT(*) FROM areas WHERE name = 'Praca'").pluck().get()).toBe(0)
  })

  it('podgląd: liczby teraz / w kopii dla każdej tabeli, trwające sesje na żywo, metadane', () => {
    const { file } = exportedFill()
    const live = memDb()
    seedDemo(live.db, NOW)
    const { preview } = stageBackup(file, ctx(live))
    expect(preview).toMatchObject({
      token: 'tok',
      fileName: 'kopia.sqlite',
      origin: 'export',
      takenAt: NOW.toISOString(),
      appVersion: '1.6.0',
      pendingMigrations: 0,
      closedOpenSessions: 0,
      liveOpenSessions: 1
    })
    expect(preview.tables.map((t) => t.table)).toEqual(listDataTables(live.sqlite).map((t) => t.name))
    expect(preview.tables.every((t) => t.incoming === 2)).toBe(true)
    expect(preview.tables.find((t) => t.table === 'areas')?.current).toBe(4)
  })

  it('po restore seed() i runMigrations() niczego nie zmieniają', () => {
    const { file } = exportedFill()
    const live = memDb()
    restoreStaged(live, stageBackup(file, ctx(live)).stagedPath, snapshotAt())
    const after = digests(live)
    seed(live.db)
    runMigrations(live.db, MIGRATIONS_FOLDER)
    expect(digests(live)).toEqual(after)
  })
})

describe('starsze poziomy schematu', () => {
  it('każdy starszy poziom migracji importuje się do bieżącego', () => {
    const levels = migrationLevels(MIGRATIONS_FOLDER)
    for (let k = 1; k < levels.length; k++) {
      const old = fileDb(join(dir, `old-${k}.sqlite`), migrationsPrefixFolder(k, join(dir, `mig-${k}`)))
      fillEveryTable(old.sqlite)
      old.sqlite.exec('UPDATE sessions SET ended_at = started_at WHERE ended_at IS NULL')
      const oldTables = listDataTables(old.sqlite)
      const raw = join(dir, `raw-${k}.sqlite`)
      old.sqlite.prepare('VACUUM INTO ?').run(raw)

      const live = memDb()
      const staged = stageBackup(raw, ctx(live, `k${k}`))
      expect(staged.preview).toMatchObject({ origin: 'raw', pendingMigrations: levels.length - k, appVersion: null })
      restoreStaged(live, staged.stagedPath, snapshotAt(`k${k}.bak`))
      // wspólne kolumny bez zmian; nowe kolumny dostają NULL / wartość domyślną
      for (const t of oldTables) {
        expect({ t: t.name, d: tableDigest(live.sqlite, t, 'main') }).toEqual({ t: t.name, d: tableDigest(old.sqlite, t, 'main') })
      }
      const liveTables = listDataTables(live.sqlite)
      for (const t of liveTables) {
        const oldT = oldTables.find((o) => o.name === t.name)
        const added = t.columns.filter((c) => !oldT?.columns.some((o) => o.name === c.name) && !c.notNull)
        for (const c of added) {
          expect(live.sqlite.prepare(`SELECT COUNT(*) FROM "${t.name}" WHERE "${c.name}" IS NOT NULL`).pluck().get()).toBe(0)
        }
      }
    }
  })

  it('starsza kopia przechodzi przez migrację przebudowującą tabelę-rodzica (FK wyłączone w stagingu)', () => {
    // folder = prawdziwe migracje + przebudowa entry_types w stylu drizzle-kit (bez zmiany kolumn)
    const folder = join(dir, 'mig-rebuild')
    const n = migrationLevels(MIGRATIONS_FOLDER).length
    migrationsPrefixFolder(n, folder)
    const journalPath = join(folder, 'meta', '_journal.json')
    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: Array<{ when: number }> }
    const when = journal.entries[journal.entries.length - 1].when + 1000
    journal.entries.push({ idx: n, version: '6', when, tag: '9999_rebuild', breakpoints: true } as never)
    writeFileSync(journalPath, JSON.stringify(journal))
    const cols = '`id`, `key`, `name`, `icon`, `fields`, `progress_mode`, `auto_retro`, `show_on_board`, `template`, `position`'
    writeFileSync(
      join(folder, '9999_rebuild.sql'),
      [
        'PRAGMA foreign_keys=OFF;',
        "CREATE TABLE `__new_entry_types` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `key` text NOT NULL, `name` text NOT NULL, `icon` text DEFAULT '' NOT NULL, `fields` text NOT NULL, `progress_mode` text DEFAULT 'none' NOT NULL, `auto_retro` integer DEFAULT false NOT NULL, `show_on_board` integer DEFAULT false NOT NULL, `template` text NOT NULL, `position` integer DEFAULT 0 NOT NULL);",
        `INSERT INTO \`__new_entry_types\`(${cols}) SELECT ${cols} FROM \`entry_types\`;`,
        'DROP TABLE `entry_types`;',
        'ALTER TABLE `__new_entry_types` RENAME TO `entry_types`;',
        'PRAGMA foreign_keys=ON;',
        'CREATE UNIQUE INDEX `entry_types_key_unique` ON `entry_types` (`key`);'
      ].join('--> statement-breakpoint\n')
    )

    const old = memDb()
    fillEveryTable(old.sqlite)
    const raw = join(dir, 'old.sqlite')
    old.sqlite.prepare('VACUUM INTO ?').run(raw)

    // kontrola: ta sama migracja na kopii z FK ON wywraca się (DROP TABLE rodzica z dziećmi)
    const control = join(dir, 'control.sqlite')
    copyFileSync(raw, control)
    const fkOn = track(createDb(control, { wal: false }))
    expect(() => runMigrations(fkOn.db, folder)).toThrow()

    const live = fileDb(join(dir, 'live.sqlite'), folder)
    const staged = stageBackup(raw, ctx(live, 'tok', { migrationsFolder: folder }))
    expect(staged.preview.pendingMigrations).toBe(1)
    restoreStaged(live, staged.stagedPath, snapshotAt())
    expect(live.sqlite.prepare('SELECT COUNT(*) FROM entry_types').pluck().get()).toBe(2)
  })
})

describe('stageBackup odrzuca', () => {
  type Case = { name: string; code: string; detail?: string; make: () => string; extra?: (live: Connection) => Partial<StageContext> }
  /** Prawidłowy eksport poprawiony ręcznie (jak ktoś edytujący plik w DB Browser). */
  const tweak = (fn: (c: Connection) => void) => (): string => {
    const { file } = exportedFill('tweaked.sqlite')
    const c = reopen(file)
    fn(c)
    c.sqlite.close()
    return file
  }
  const cases: Case[] = [
    {
      name: 'śmieci',
      code: 'not-sqlite',
      make: () => {
        const p = join(dir, 'junk.sqlite')
        writeFileSync(p, 'to nie jest baza '.repeat(20))
        return p
      }
    },
    {
      name: 'pusty plik',
      code: 'not-sqlite',
      make: () => {
        const p = join(dir, 'empty.sqlite')
        writeFileSync(p, '')
        return p
      }
    },
    {
      name: 'obca baza',
      code: 'not-tracker',
      make: () => {
        const p = join(dir, 'foreign.sqlite')
        const c = track(createDb(p, { wal: false }))
        c.sqlite.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)')
        c.sqlite.close()
        return p
      }
    },
    {
      name: 'ucięty plik',
      code: 'corrupt',
      make: () => {
        const { file } = exportedFill('truncated.sqlite')
        truncateSync(file, Math.floor(statSync(file).size / 2))
        return file
      }
    },
    {
      name: 'zniszczone strony',
      code: 'corrupt',
      make: () => {
        const { file } = exportedFill('trashed.sqlite')
        const buf = readFileSync(file)
        const pageSize = buf.readUInt16BE(16)
        buf.fill(0xab, pageSize, buf.length)
        writeFileSync(file, buf)
        return file
      }
    },
    {
      name: 'poziom nowszy niż aplikacja',
      code: 'too-new',
      detail: '9.9.9',
      make: tweak((c) => {
        c.sqlite.exec(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('x', ${Number.MAX_SAFE_INTEGER})`)
        c.sqlite.exec("UPDATE tracker_backup SET value = '9.9.9' WHERE key = 'appVersion'")
      })
    },
    {
      name: 'nowszy format pliku',
      code: 'too-new',
      detail: '1.6.0',
      make: tweak((c) => c.sqlite.exec("UPDATE tracker_backup SET value = '2' WHERE key = 'formatVersion'"))
    },
    {
      name: 'cudzy format w metadanych',
      code: 'not-tracker',
      make: tweak((c) => c.sqlite.exec("UPDATE tracker_backup SET value = 'inny' WHERE key = 'format'"))
    },
    {
      name: 'nieznany poziom poniżej maksimum',
      code: 'unknown-schema',
      make: tweak((c) => c.sqlite.exec('UPDATE __drizzle_migrations SET created_at = created_at - 1 WHERE rowid = 1'))
    },
    {
      name: 'osierocony stage_id',
      code: 'broken-references',
      detail: '1',
      make: tweak((c) => c.sqlite.exec('UPDATE entries SET stage_id = 999 WHERE id = 1'))
    },
    {
      name: 'zepsuty entries.data',
      code: 'invalid-json',
      detail: 'entries.data',
      make: tweak((c) => c.sqlite.exec("UPDATE entries SET data = '{zepsute' WHERE id = 2"))
    },
    {
      name: 'brak typów wpisów',
      code: 'no-entry-types',
      make: tweak((c) => c.sqlite.exec('DELETE FROM entries; DELETE FROM stages; DELETE FROM entry_types'))
    },
    {
      name: 'za duży plik',
      code: 'too-large',
      make: () => exportedFill('big.sqlite').file,
      extra: () => ({ maxBytes: 10 })
    },
    {
      name: 'brak pliku',
      code: 'read-failed',
      make: () => join(dir, 'nie-ma.sqlite')
    }
  ]

  for (const c of cases) {
    it(`${c.name} → ${c.code}; plik źródłowy nietknięty, bez -wal/-shm, staging pusty`, () => {
      const live = memDb()
      seed(live.db)
      const before = digests(live)
      const file = c.make()
      const shaBefore = existsSync(file) ? sha(file) : null
      let caught: unknown
      try {
        stageBackup(file, ctx(live, 'tok', c.extra?.(live)))
      } catch (err) {
        caught = err
      }
      expect(caught).toBeInstanceOf(BackupError)
      expect({ code: (caught as BackupError).code, detail: (caught as BackupError).detail }).toEqual({
        code: c.code,
        detail: c.detail
      })
      if (shaBefore) expect(sha(file)).toBe(shaBefore)
      expect(existsSync(`${file}-wal`)).toBe(false)
      expect(existsSync(`${file}-shm`)).toBe(false)
      expect(stagingEmpty()).toBe(true)
      expect(digests(live)).toEqual(before)
    })
  }

  it('bieżąca baza (inna wielkość liter na Windows, także -wal) → is-live-db', () => {
    const livePath = join(dir, 'Live.sqlite')
    const live = fileDb(livePath)
    const picked = process.platform === 'win32' ? join(dir, 'LIVE.SQLITE') : livePath
    for (const p of [picked, `${livePath}-wal`]) {
      expect(() => stageBackup(p, ctx(live, 'tok', { liveDbPath: livePath }))).toThrow(
        expect.objectContaining({ code: 'is-live-db' })
      )
    }
  })
})

describe('surowe pliki bazy', () => {
  it('kopia bez metadanych (origin raw, takenAt = mtime) z sąsiednim -wal — wiersze tylko z WAL są w podglądzie', () => {
    const src = fileDb(join(dir, 'src.sqlite'))
    seed(src.db)
    src.sqlite.pragma('wal_autocheckpoint = 0')
    src.sqlite.exec("INSERT INTO areas (name, color) VALUES ('tylko-w-WAL', 'x')")
    const raw = join(dir, 'tracker.sqlite.2026-10-01.bak')
    copyFileSync(join(dir, 'src.sqlite'), raw)
    copyFileSync(join(dir, 'src.sqlite-wal'), `${raw}-wal`)
    const live = memDb()
    const { preview } = stageBackup(raw, ctx(live))
    expect(preview.origin).toBe('raw')
    expect(preview.appVersion).toBeNull()
    expect(preview.takenAt).toBe(statSync(raw).mtime.toISOString())
    expect(preview.tables.find((t) => t.table === 'areas')?.incoming).toBe(1)
  })

  it('surowy plik z trwającą sesją: zamyka ją na takenAt i raportuje closedOpenSessions', () => {
    const src = memDb()
    seedDemo(src.db, NOW)
    const raw = join(dir, 'dev.sqlite')
    src.sqlite.prepare('VACUUM INTO ?').run(raw)
    const live = memDb()
    const staged = stageBackup(raw, ctx(live))
    expect(staged.preview.closedOpenSessions).toBe(1)
    restoreStaged(live, staged.stagedPath, snapshotAt())
    expect(openSessionCount(live.db)).toBe(0)
    expect(live.sqlite.prepare('SELECT COUNT(*) FROM sessions WHERE ended_at = ?').pluck().get(staged.preview.takenAt)).toBe(1)
  })
})

describe('restoreStaged', () => {
  it('kopia poprzedniego stanu zapisana PRZED zmianą i sama da się przywrócić (cofnięcie)', () => {
    const live = memDb()
    seedDemo(live.db, NOW)
    stopSession(live.db, NOW)
    const before = digests(live)
    const { file } = exportedFill()
    const snap = snapshotAt()
    restoreStaged(live, stageBackup(file, ctx(live, 'a')).stagedPath, snap)
    expect(digests(live)).not.toEqual(before)
    expect(readBackupMeta(reopen(snap.path).sqlite)?.kind).toBe('pre-import')
    const undo = stageBackup(snap.path, ctx(live, 'b'))
    expect(undo.preview.origin).toBe('pre-import')
    restoreStaged(live, undo.stagedPath, snapshotAt('undo.bak'))
    expect(digests(live)).toEqual(before)
  })

  it('nieudany zapis kopii poprzedniego stanu → snapshot-failed, baza bez zmian, bak_src nieprzyłączona', () => {
    const live = memDb()
    seedDemo(live.db, NOW)
    const before = digests(live)
    const { file } = exportedFill()
    const staged = stageBackup(file, ctx(live))
    const blocker = join(dir, 'plik-zamiast-katalogu')
    writeFileSync(blocker, 'x')
    expect(() => restoreStaged(live, staged.stagedPath, { path: join(blocker, 'snap.bak'), meta: meta() })).toThrow(
      expect.objectContaining({ code: 'snapshot-failed' })
    )
    expect(digests(live)).toEqual(before)
    expect((live.sqlite.pragma('database_list') as Array<{ name: string }>).map((d) => d.name)).not.toContain('bak_src')
  })

  it('brak pliku stagingu → expired', () => {
    const live = memDb()
    expect(() => restoreStaged(live, join(dir, 'nie-ma.sqlite'), snapshotAt())).toThrow(expect.objectContaining({ code: 'expired' }))
  })

  it('po sukcesie bak_src odłączona, WAL zcheckpointowany', () => {
    const livePath = join(dir, 'live.sqlite')
    const live = fileDb(livePath)
    seed(live.db)
    startSession(live.db, null, NOW)
    const { file } = exportedFill()
    restoreStaged(live, stageBackup(file, ctx(live)).stagedPath, snapshotAt())
    expect((live.sqlite.pragma('database_list') as Array<{ name: string }>).map((d) => d.name)).toEqual(['main'])
    expect(statSync(`${livePath}-wal`).size).toBe(0)
  })
})

describe('firstStructureDiff', () => {
  const t = (name: string, cols: Array<[string, string, boolean, number]>): DataTable => ({
    name,
    columns: cols.map(([n, type, notNull, pk]) => ({ name: n, type, notNull, pk }))
  })
  it('zgodne mimo kolejności kolumn i wielkości liter typu; różnica typu, NOT NULL, brak tabeli → nazwa', () => {
    const a = [t('x', [['id', 'INTEGER', true, 1], ['v', 'text', false, 0]])]
    expect(firstStructureDiff(a, [t('x', [['v', 'TEXT', false, 0], ['id', 'integer', true, 1]])])).toBeNull()
    expect(firstStructureDiff(a, [t('x', [['id', 'INTEGER', true, 1], ['v', 'INTEGER', false, 0]])])).toBe('x')
    expect(firstStructureDiff(a, [t('x', [['id', 'INTEGER', true, 1], ['v', 'TEXT', true, 0]])])).toBe('x')
    expect(firstStructureDiff(a, [...a, t('y', [])])).toBe('y')
    expect(firstStructureDiff([], a)).toBe('x')
  })
})
