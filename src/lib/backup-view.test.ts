import { describe, expect, it } from 'vitest'
import type { TFn } from '@/i18n'
import { strings } from '@/i18n/strings'
import type { BackupErrorCode, RestorePreview } from '@shared/types'
import { BACKUP_ERROR_KEY, dialogText, diffRows, errorText, exportDesc, metaLine, sessionWillEnd } from './backup-view'

// t jak w aplikacji (pl), z interpolacją {zmiennych}
const t: TFn = (key, vars) =>
  strings.pl[key].replace(/\{(\w+)\}/g, (_m, k: string) => String(vars?.[k] ?? `{${k}}`))

const preview = (over: Partial<RestorePreview> = {}): RestorePreview => ({
  token: 't',
  fileName: 'kopia.sqlite',
  origin: 'export',
  takenAt: new Date(2026, 9, 21, 14, 3).toISOString(),
  appVersion: '1.6.0',
  pendingMigrations: 0,
  closedOpenSessions: 0,
  liveOpenSessions: 0,
  tables: [],
  ...over
})

const CODES: BackupErrorCode[] = [
  'busy', 'is-live-db', 'too-large', 'read-failed', 'not-sqlite', 'corrupt', 'not-tracker', 'too-new',
  'unknown-schema', 'migration-failed', 'broken-references', 'invalid-json', 'no-entry-types', 'no-space',
  'no-access', 'write-failed', 'expired', 'snapshot-failed', 'restore-failed'
]

describe('backup-view', () => {
  it('każdy BackupErrorCode ma tekst w pl i en', () => {
    expect(Object.keys(BACKUP_ERROR_KEY).sort()).toEqual([...CODES].sort())
    for (const code of CODES) {
      expect(strings.pl[BACKUP_ERROR_KEY[code]].length).toBeGreaterThan(0)
      expect(strings.en[BACKUP_ERROR_KEY[code]].length).toBeGreaterThan(0)
    }
  })

  it('errorText dokleja detal przez bk.err.withDetail', () => {
    expect(errorText({ code: 'corrupt' }, t)).toBe('Plik jest uszkodzony albo niekompletny.')
    expect(errorText({ code: 'invalid-json', detail: 'entries.data' }, t)).toBe(
      'Kopia zawiera uszkodzone pola danych. · entries.data'
    )
  })

  it('diffRows: znane tabele w ustalonej kolejności z etykietą; nieznana z surową nazwą i mono na końcu', () => {
    const rows = diffRows(
      preview({
        tables: [
          { table: 'areas', current: 3, incoming: 3 },
          { table: 'zz_future', current: 0, incoming: 2 },
          { table: 'entries', current: 16, incoming: 12 },
          { table: 'a_future', current: 1, incoming: 1 }
        ]
      }),
      t
    )
    expect(rows.map((r) => [r.key, r.label, r.mono])).toEqual([
      ['entries', 'wpisy', false],
      ['areas', 'obszary', false],
      ['a_future', 'a_future', true],
      ['zz_future', 'zz_future', true]
    ])
    expect(rows[0]).toMatchObject({ current: 16, incoming: 12 })
  })

  it('metaLine: eksport / stan sprzed przywracania / surowy plik', () => {
    expect(metaLine(preview(), t, 'pl')).toMatch(/^Kopia z .*2026.* · Tracker 1\.6\.0$/)
    expect(metaLine(preview({ origin: 'pre-import' }), t, 'pl')).toMatch(/^Stan sprzed przywracania · .*2026/)
    expect(metaLine(preview({ origin: 'raw', appVersion: null }), t, 'pl')).toMatch(/^Plik bazy bez metadanych · stan z .*2026/)
  })

  it('dialogText: tytuł, przycisk i filtry dla eksportu i importu', () => {
    expect(dialogText(t, 'export')).toEqual({
      title: 'Zapisz kopię danych',
      buttonLabel: 'Zapisz kopię',
      filterName: 'Kopia Trackera',
      allFilesName: 'Wszystkie pliki'
    })
    expect(dialogText(t, 'import')).toMatchObject({ title: 'Wybierz kopię do przywrócenia', buttonLabel: 'Sprawdź plik' })
  })

  it('sessionWillEnd: trwająca w bazie albo wstrzymana w rendererze', () => {
    expect(sessionWillEnd(preview(), false)).toBe(false)
    expect(sessionWillEnd(preview({ liveOpenSessions: 1 }), false)).toBe(true)
    expect(sessionWillEnd(preview(), true)).toBe(true)
  })

  it('exportDesc: ostatni eksport z datą i ścieżką albo opis domyślny', () => {
    expect(exportDesc(null, t, 'pl')).toBe(strings.pl['set.backupExport.desc'])
    const d = exportDesc({ at: new Date(2026, 9, 21, 14, 3).toISOString(), path: 'D:\\kopie\\a.sqlite' }, t, 'pl')
    expect(d).toMatch(/^Ostatni eksport: .*2026.* · D:\\kopie\\a\.sqlite$/)
  })
})
