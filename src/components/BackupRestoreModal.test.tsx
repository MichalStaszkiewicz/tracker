// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import type { RestoreFlow } from '@/hooks/useBackup'
import type { RestorePreview } from '@shared/types'
import { BackupRestoreModal } from './BackupRestoreModal'

afterEach(cleanup)

const preview: RestorePreview = {
  token: 't',
  fileName: 'tracker-backup-2026-10-20-090000.sqlite',
  origin: 'export',
  takenAt: new Date(2026, 9, 20, 9, 0).toISOString(),
  appVersion: '1.6.0',
  pendingMigrations: 1,
  closedOpenSessions: 2,
  liveOpenSessions: 1,
  tables: [
    { table: 'entries', current: 16, incoming: 12 },
    { table: 'areas', current: 3, incoming: 3 }
  ]
}

function mount(flow: Exclude<RestoreFlow, { phase: 'idle' }>, sessionWillEnd = true) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const view = render(
    <I18nProvider>
      <BackupRestoreModal flow={flow} sessionWillEnd={sessionWillEnd} onConfirm={onConfirm} onCancel={onCancel} />
    </I18nProvider>
  )
  return { ...view, onConfirm, onCancel }
}

describe('BackupRestoreModal', () => {
  it('preview: plik w odznace, linia meta, uwagi, liczniki, ostrzeżenie o sesji; Anuluj ma fokus', () => {
    const { onConfirm, onCancel } = mount({ phase: 'preview', preview })
    const dialog = screen.getByRole('dialog', { name: 'Przywracanie z kopii' })
    expect(dialog.textContent).toContain('tracker-backup-2026-10-20-090000.sqlite')
    expect(dialog.textContent).toMatch(/Kopia z .*2026.* · Tracker 1\.6\.0/)
    expect(dialog.textContent).toContain('migracje: 1')
    expect(dialog.textContent).toContain('Niezakończone sesje w kopii: 2')
    expect(dialog.textContent).toContain('Trwająca sesja zostanie zakończona')
    expect(screen.getByText('wpisy')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Anuluj' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zastąp dane' }))
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('bez trwającej sesji i bez migracji — brak tych uwag', () => {
    mount({ phase: 'preview', preview: { ...preview, pendingMigrations: 0, closedOpenSessions: 0 } }, false)
    const text = screen.getByRole('dialog').textContent ?? ''
    expect(text).not.toContain('Trwająca sesja')
    expect(text).not.toContain('migracje')
    expect(text).not.toContain('Niezakończone')
  })

  it('restoring: przyciski wyłączone, Esc i tło nie zamykają', () => {
    const { onCancel, container } = mount({ phase: 'restoring', preview })
    expect((screen.getByRole('button', { name: 'Przywracam…' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Anuluj' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.mouseDown(container.querySelector('.palette__backdrop')!)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('failed: komunikat błędu, „Twoje dane są bez zmian.”, Zamknij woła onCancel', () => {
    const { onCancel } = mount({ phase: 'failed', preview, failure: { status: 'error', code: 'snapshot-failed' } })
    expect(screen.getByRole('alert').textContent).toContain('Nie udało się zapisać kopii obecnych danych')
    expect(screen.getByRole('alert').textContent).toContain('Twoje dane są bez zmian.')
    expect(screen.queryByRole('button', { name: 'Zastąp dane' })).toBeNull()
    const closes = screen.getAllByRole('button', { name: 'Zamknij' })
    fireEvent.click(closes[closes.length - 1])
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
