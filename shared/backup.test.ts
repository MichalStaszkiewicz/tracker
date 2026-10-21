import { describe, expect, it } from 'vitest'
import { backupFileName, planSchemaLevel, snapshotFileName } from './backup'

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
