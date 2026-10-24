// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BackupStatus, RestoreNotice } from '@shared/types'

const notice: RestoreNotice = {
  restoredAt: '2026-10-21T12:00:00.000Z',
  fileName: 'kopia.sqlite',
  origin: 'export',
  takenAt: '2026-10-20T10:00:00.000Z',
  snapshotFileName: 'tracker.sqlite.pre-import.x.bak',
  backupsDir: 'C:\\backups'
}
let server: RestoreNotice | null = notice
const status = vi.fn(async (): Promise<BackupStatus> => ({ lastExport: null, lastRestore: server }))
const dismissNotice = vi.fn(() => {
  server = null
})

vi.mock('@/api', () => ({
  api: { backup: { status: () => status(), dismissNotice: () => dismissNotice() } }
}))

const { useRestoreNotice } = await import('./useRestoreNotice')

beforeEach(() => {
  server = notice
  status.mockClear()
  dismissNotice.mockClear()
})
afterEach(cleanup)

describe('useRestoreNotice', () => {
  it('pokazuje lastRestore ze status(), także w StrictMode (odczyt nie konsumuje)', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
    const { result } = renderHook(() => useRestoreNotice(), { wrapper })
    await waitFor(() => expect(result.current.notice).toEqual(notice))
    expect(status.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(dismissNotice).not.toHaveBeenCalled()
  })

  it('dismiss woła api.backup.dismissNotice i chowa', async () => {
    const { result } = renderHook(() => useRestoreNotice())
    await waitFor(() => expect(result.current.notice).toEqual(notice))
    act(() => result.current.dismiss())
    expect(dismissNotice).toHaveBeenCalledTimes(1)
    expect(result.current.notice).toBeNull()
  })

  it('brak przywrócenia → null', async () => {
    server = null
    const { result } = renderHook(() => useRestoreNotice())
    await waitFor(() => expect(status).toHaveBeenCalled())
    expect(result.current.notice).toBeNull()
  })
})
