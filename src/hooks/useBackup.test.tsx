// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import type {
  BackupDialogText,
  BackupExportResult,
  BackupPickResult,
  BackupRestoreResult,
  BackupStatus,
  RestorePreview
} from '@shared/types'

const preview: RestorePreview = {
  token: 'tok-1',
  fileName: 'kopia.sqlite',
  origin: 'export',
  takenAt: '2026-10-21T12:00:00.000Z',
  appVersion: '1.6.0',
  pendingMigrations: 0,
  closedOpenSessions: 0,
  liveOpenSessions: 0,
  tables: [{ table: 'entries', current: 3, incoming: 5 }]
}
const LAST = { at: '2026-10-20T10:00:00.000Z', path: 'D:\\kopie\\a.sqlite' }

const status = vi.fn(async (): Promise<BackupStatus> => ({ lastExport: LAST, lastRestore: null }))
const exportFn = vi.fn(async (_t: BackupDialogText): Promise<BackupExportResult> => ({ status: 'canceled' }))
const pick = vi.fn(async (_t: BackupDialogText): Promise<BackupPickResult> => ({ status: 'ready', preview }))
const restore = vi.fn(async (_token: string): Promise<BackupRestoreResult> => ({
  status: 'restored',
  notice: {
    restoredAt: '',
    fileName: 'kopia.sqlite',
    origin: 'export',
    takenAt: '',
    snapshotFileName: 's.bak',
    backupsDir: 'b'
  }
}))
const discard = vi.fn((_token: string) => undefined)

vi.mock('@/api', () => ({
  api: {
    backup: {
      status: () => status(),
      export: (t: BackupDialogText) => exportFn(t),
      pick: (t: BackupDialogText) => pick(t),
      restore: (token: string) => restore(token),
      discard: (token: string) => discard(token),
      dismissNotice: () => undefined
    }
  }
}))

const { useBackup } = await import('./useBackup')

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>
let reload: ReturnType<typeof vi.fn>
beforeEach(() => {
  for (const f of [status, exportFn, pick, restore, discard]) f.mockClear()
  reload = vi.fn()
})
afterEach(cleanup)

async function mounted() {
  const view = renderHook(() => useBackup(reload), { wrapper })
  await waitFor(() => expect(view.result.current.lastExport).toEqual(LAST))
  return view
}

describe('useBackup — eksport', () => {
  it('status przy montowaniu → lastExport', async () => {
    await mounted()
    expect(status).toHaveBeenCalledTimes(1)
  })

  it('anulowany nic nie zmienia; zapisany aktualizuje lastExport i czyści błąd', async () => {
    const { result } = await mounted()
    await act(() => result.current.exportNow())
    expect(exportFn.mock.calls[0][0]).toMatchObject({ title: 'Zapisz kopię danych', filterName: 'Kopia Trackera' })
    expect(result.current.lastExport).toEqual(LAST)
    exportFn.mockResolvedValueOnce({ status: 'error', code: 'no-space' })
    await act(() => result.current.exportNow())
    expect(result.current.exportFailure).toEqual({ status: 'error', code: 'no-space' })
    const next = { at: '2026-10-21T12:00:00.000Z', path: 'E:\\b.sqlite' }
    exportFn.mockResolvedValueOnce({ status: 'saved', export: next })
    await act(() => result.current.exportNow())
    expect(result.current.lastExport).toEqual(next)
    expect(result.current.exportFailure).toBeNull()
  })

  it('odrzucenie IPC → write-failed', async () => {
    const { result } = await mounted()
    exportFn.mockRejectedValueOnce(new Error('ipc'))
    await act(() => result.current.exportNow())
    expect(result.current.exportFailure).toEqual({ status: 'error', code: 'write-failed' })
  })
})

describe('useBackup — przywracanie', () => {
  it('pick: anulowany → idle; ready → preview; błąd → pickFailure bez modala; odrzucenie → read-failed', async () => {
    const { result } = await mounted()
    pick.mockResolvedValueOnce({ status: 'canceled' })
    await act(() => result.current.pickRestore())
    expect(result.current.flow).toEqual({ phase: 'idle' })
    pick.mockResolvedValueOnce({ status: 'error', code: 'too-new', detail: '2.0.0' })
    await act(() => result.current.pickRestore())
    expect(result.current.pickFailure).toEqual({ status: 'error', code: 'too-new', detail: '2.0.0' })
    expect(result.current.flow.phase).toBe('idle')
    pick.mockRejectedValueOnce(new Error('ipc'))
    await act(() => result.current.pickRestore())
    expect(result.current.pickFailure?.code).toBe('read-failed')
    await act(() => result.current.pickRestore())
    expect(result.current.flow).toEqual({ phase: 'preview', preview })
    expect(result.current.pickFailure).toBeNull()
  })

  it('confirm: restored → reload raz; podwójny confirm → jedno restore', async () => {
    const { result } = await mounted()
    await act(() => result.current.pickRestore())
    await act(async () => {
      await Promise.all([result.current.confirmRestore(), result.current.confirmRestore()])
    })
    expect(restore).toHaveBeenCalledTimes(1)
    expect(restore).toHaveBeenCalledWith('tok-1')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('confirm: błąd → faza failed z kodem, bez reload; Zamknij → idle', async () => {
    const { result } = await mounted()
    await act(() => result.current.pickRestore())
    restore.mockResolvedValueOnce({ status: 'error', code: 'snapshot-failed' })
    await act(() => result.current.confirmRestore())
    expect(result.current.flow).toEqual({ phase: 'failed', preview, failure: { status: 'error', code: 'snapshot-failed' } })
    expect(reload).not.toHaveBeenCalled()
    act(() => result.current.cancel())
    expect(result.current.flow).toEqual({ phase: 'idle' })
    expect(discard).not.toHaveBeenCalled() // staging zużyty przez restore
  })

  it('confirm: odrzucenie IPC → failed z restore-failed', async () => {
    const { result } = await mounted()
    await act(() => result.current.pickRestore())
    restore.mockRejectedValueOnce(new Error('ipc'))
    await act(() => result.current.confirmRestore())
    expect(result.current.flow).toMatchObject({ phase: 'failed', failure: { code: 'restore-failed' } })
  })

  it('cancel w preview → discard(token); odmontowanie w preview → discard', async () => {
    const a = await mounted()
    await act(() => a.result.current.pickRestore())
    act(() => a.result.current.cancel())
    expect(discard).toHaveBeenCalledWith('tok-1')
    expect(a.result.current.flow).toEqual({ phase: 'idle' })

    discard.mockClear()
    const b = await mounted()
    await act(() => b.result.current.pickRestore())
    b.unmount()
    expect(discard).toHaveBeenCalledWith('tok-1')
  })

  it('w trakcie przywracania cancel nic nie robi', async () => {
    let finish: (r: BackupRestoreResult) => void = () => undefined
    restore.mockImplementationOnce(() => new Promise((res) => (finish = res)))
    const { result } = await mounted()
    await act(() => result.current.pickRestore())
    let pending: Promise<void> = Promise.resolve()
    act(() => {
      pending = result.current.confirmRestore()
    })
    expect(result.current.flow.phase).toBe('restoring')
    act(() => result.current.cancel())
    expect(result.current.flow.phase).toBe('restoring')
    expect(discard).not.toHaveBeenCalled()
    await act(async () => {
      finish({ status: 'error', code: 'restore-failed' })
      await pending
    })
    expect(result.current.flow.phase).toBe('failed')
  })
})
