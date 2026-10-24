import { describe, expect, it } from 'vitest'
import { backupFileName, planSchemaLevel, snapshotFileName, staleStartupBackups, startupBackupFileName } from './backup'

describe('backupFileName', () => {
  it('lokalny czas, zera wiodące, bez znaków zabronionych w Windows', () => {
    expect(backupFileName(new Date(2026, 0, 5, 9, 7, 3))).toBe('tracker-backup-2026-01-05-090703.sqlite')
    const late = backupFileName(new Date(2026, 11, 31, 23, 59, 59))
    expect(late).toBe('tracker-backup-2026-12-31-235959.sqlite')
    expect(late).not.toMatch(/[<>:"/\\|?*]/)
  })
})

describe('snapshotFileName', () => {
  it('<baza>.pre-import.<znacznik>.bak w stylu kopii startowych', () => {
    const name = snapshotFileName('tracker.sqlite', new Date('2026-10-21T12:03:12.345Z'))
    expect(name).toBe('tracker.sqlite.pre-import.2026-10-21T12-03-12-345Z.bak')
    expect(name).not.toMatch(/[<>:"/\\|?*]/)
  })
})

describe('startupBackupFileName', () => {
  it('<baza>.<znacznik ISO>.bak bez znaków zabronionych w Windows', () => {
    const name = startupBackupFileName('tracker.sqlite', new Date('2026-10-21T12:03:12.345Z'))
    expect(name).toBe('tracker.sqlite.2026-10-21T12-03-12-345Z.bak')
    expect(name).not.toMatch(/[<>:"/\\|?*]/)
  })
})

describe('staleStartupBackups', () => {
  const at = (iso: string): string => startupBackupFileName('tracker.sqlite', new Date(iso))
  const a = at('2026-09-30T23:59:59.999Z')
  const b = at('2026-10-01T00:00:00.000Z')
  const c = at('2026-10-21T08:00:00.000Z')

  it('zwraca najstarsze ponad keep (kolejność wejścia bez znaczenia)', () => {
    expect(staleStartupBackups([c, a, b], 'tracker.sqlite', 2)).toEqual([a])
    expect(staleStartupBackups([b, c, a], 'tracker.sqlite', 1)).toEqual([b, a])
  })

  it('keep ≥ liczba kopii → nic; keep 0 → wszystkie', () => {
    expect(staleStartupBackups([a, b], 'tracker.sqlite', 2)).toEqual([])
    expect(staleStartupBackups([a, b], 'tracker.sqlite', 0)).toEqual([b, a])
  })

  it('pomija kopie sprzed przywrócenia, innej bazy, .partial i obce pliki', () => {
    const names = [
      a,
      snapshotFileName('tracker.sqlite', new Date('2026-01-01T00:00:00.000Z')),
      startupBackupFileName('dev.sqlite', new Date('2026-01-01T00:00:00.000Z')),
      startupBackupFileName('trackerXsqlite', new Date('2026-01-01T00:00:00.000Z')),
      `${b}.partial`,
      'tracker.sqlite.stara.bak',
      'notatka.txt'
    ]
    expect(staleStartupBackups(names, 'tracker.sqlite', 0)).toEqual([a])
  })
})

describe('planSchemaLevel', () => {
  const app = [100, 200, 300]

  it('ten sam poziom → ok, pending 0', () => {
    expect(planSchemaLevel([100, 200, 300], app)).toEqual({ ok: true, pending: 0 })
  })

  it('starszy prefiks → ok, pending = brakujące migracje', () => {
    expect(planSchemaLevel([100], app)).toEqual({ ok: true, pending: 2 })
    expect(planSchemaLevel([100, 200], app)).toEqual({ ok: true, pending: 1 })
  })

  it('pusta lista → not-tracker', () => {
    expect(planSchemaLevel([], app)).toEqual({ ok: false, code: 'not-tracker' })
  })

  it('ostatni poziom > aplikacji → too-new', () => {
    expect(planSchemaLevel([100, 200, 300, 400], app)).toEqual({ ok: false, code: 'too-new' })
    expect(planSchemaLevel([100, 400], app)).toEqual({ ok: false, code: 'too-new' })
  })

  it('nieznany poziom poniżej maksimum, luka, zła kolejność → unknown-schema', () => {
    expect(planSchemaLevel([100, 150], app)).toEqual({ ok: false, code: 'unknown-schema' })
    expect(planSchemaLevel([100, 300], app)).toEqual({ ok: false, code: 'unknown-schema' })
    expect(planSchemaLevel([200, 100], app)).toEqual({ ok: false, code: 'unknown-schema' })
    expect(planSchemaLevel([100, 100], app)).toEqual({ ok: false, code: 'unknown-schema' })
  })
})
