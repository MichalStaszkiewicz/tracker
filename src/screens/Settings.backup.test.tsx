// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { DEFAULT_SETTINGS } from '@shared/settings'
import { resolveShortcuts } from '@shared/shortcuts'
import type {
  BackupDialogText,
  BackupExportResult,
  BackupPickResult,
  BackupRestoreResult,
  RestorePreview
} from '@shared/types'

const preview: RestorePreview = {
  token: 'tok-9',
  fileName: 'tracker-backup-2026-10-20-090000.sqlite',
  origin: 'export',
  takenAt: '2026-10-20T07:00:00.000Z',
  appVersion: '1.6.0',
  pendingMigrations: 0,
  closedOpenSessions: 0,
  liveOpenSessions: 0,
  tables: [
    { table: 'entries', current: 16, incoming: 12 },
    { table: 'links', current: 4, incoming: 9 }
  ]
}

const exportFn = vi.fn(async (_t: BackupDialogText): Promise<BackupExportResult> => ({
  status: 'saved',
  export: { at: '2026-10-21T12:00:00.000Z', path: 'D:\\kopie\\tracker-backup.sqlite' }
}))
const pick = vi.fn(async (_t: BackupDialogText): Promise<BackupPickResult> => ({ status: 'ready', preview }))
const restore = vi.fn(async (_token: string): Promise<BackupRestoreResult> => ({
  status: 'restored',
  notice: { restoredAt: '', fileName: '', origin: 'export', takenAt: '', snapshotFileName: '', backupsDir: '' }
}))
const reloadApp = vi.fn()

vi.mock('@/api', () => ({
  api: {
    system: { dbPath: async () => 'C:\\data\\tracker.sqlite', openDbFolder: () => undefined },
    backup: {
      status: async () => ({ lastExport: null, lastRestore: null }),
      export: (t: BackupDialogText) => exportFn(t),
      pick: (t: BackupDialogText) => pick(t),
      restore: (token: string) => restore(token),
      discard: () => undefined,
      dismissNotice: () => undefined
    }
  }
}))
vi.mock('@/lib/reload', () => ({ reloadApp: () => reloadApp() }))
vi.mock('@/settings-context', () => ({
  useSettingsCtx: () => ({ settings: DEFAULT_SETTINGS, set: vi.fn(), shortcuts: resolveShortcuts({}), loaded: true })
}))
vi.mock('@/session-context', () => ({ useSessionCtx: () => ({ active: null, paused: null }) }))

const { Settings } = await import('./Settings')

beforeEach(() => {
  for (const f of [exportFn, pick, restore, reloadApp]) f.mockClear()
})
afterEach(cleanup)

const mount = () =>
  render(
    <I18nProvider>
      <Settings />
    </I18nProvider>
  )

describe('Ustawienia — kopia zapasowa', () => {
  it('martwe przyciski CSV/JSON zniknęły; są Eksportuj… i Wybierz plik…', () => {
    mount()
    expect(screen.queryByRole('button', { name: 'CSV' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'JSON' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Eksportuj…' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Wybierz plik…' })).toBeTruthy()
  })

  it('Eksportuj… woła api.backup.export z polskim tekstem okna; sukces pokazuje „Ostatni eksport”', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Eksportuj…' }))
    await waitFor(() => expect(screen.getByText(/Ostatni eksport: .* · D:\\kopie\\tracker-backup\.sqlite/)).toBeTruthy())
    expect(exportFn.mock.calls[0][0]).toEqual({
      title: 'Zapisz kopię danych',
      buttonLabel: 'Zapisz kopię',
      filterName: 'Kopia Trackera',
      allFilesName: 'Wszystkie pliki'
    })
  })

  it('Wybierz plik… otwiera podgląd z nazwą pliku i licznikami; Zastąp dane woła restore(token) i przeładowuje', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Wybierz plik…' }))
    const dialog = await screen.findByRole('dialog', { name: 'Przywracanie z kopii' })
    expect(dialog.textContent).toContain('tracker-backup-2026-10-20-090000.sqlite')
    expect(dialog.textContent).toContain('wpisy')
    expect(dialog.textContent).toContain('linki')
    fireEvent.click(screen.getByRole('button', { name: 'Zastąp dane' }))
    await waitFor(() => expect(reloadApp).toHaveBeenCalledTimes(1))
    expect(restore).toHaveBeenCalledWith('tok-9')
  })

  it('błąd wyboru (too-new) pokazuje komunikat w wierszu importu, bez okna', async () => {
    pick.mockResolvedValueOnce({ status: 'error', code: 'too-new', detail: '2.0.0' })
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Wybierz plik…' }))
    const msg = await screen.findByText('Kopia z nowszej wersji Trackera — zaktualizuj aplikację. · 2.0.0')
    expect(msg.classList.contains('setrow__desc--err')).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
