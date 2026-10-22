import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/api'
import { useT } from '@/i18n'
import { dialogText } from '@/lib/backup-view'
import { reloadApp } from '@/lib/reload'
import type { BackupFailure, LastExport, RestorePreview } from '@shared/types'

export type RestoreFlow =
  | { phase: 'idle' }
  | { phase: 'preview'; preview: RestorePreview }
  | { phase: 'restoring'; preview: RestorePreview }
  | { phase: 'failed'; preview: RestorePreview; failure: BackupFailure }

export interface BackupApi {
  lastExport: LastExport | null
  busy: boolean
  exportFailure: BackupFailure | null
  pickFailure: BackupFailure | null
  flow: RestoreFlow
  exportNow(): Promise<void>
  pickRestore(): Promise<void>
  confirmRestore(): Promise<void>
  cancel(): void
}

const failure = (code: BackupFailure['code']): BackupFailure => ({ status: 'error', code })

/**
 * Eksport i przywracanie kopii: jedna operacja naraz, podgląd przed zastąpieniem danych,
 * po udanym przywróceniu pełne przeładowanie (reset stanu sesji, ustawień i list).
 */
export function useBackup(reload: () => void = reloadApp): BackupApi {
  const { t } = useT()
  const [lastExport, setLastExport] = useState<LastExport | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [exportFailure, setExportFailure] = useState<BackupFailure | null>(null)
  const [pickFailure, setPickFailure] = useState<BackupFailure | null>(null)
  const [flow, setFlowState] = useState<RestoreFlow>({ phase: 'idle' })
  const flowRef = useRef(flow)
  const setFlow = useCallback((next: RestoreFlow) => {
    flowRef.current = next
    setFlowState(next)
  }, [])

  useEffect(() => {
    let alive = true
    api.backup
      .status()
      .then((s) => {
        if (alive) setLastExport(s.lastExport)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  // Opuszczenie ekranu z otwartym podglądem porzuca przygotowaną kopię roboczą.
  useEffect(
    () => () => {
      const f = flowRef.current
      if (f.phase === 'preview') api.backup.discard(f.preview.token)
    },
    []
  )

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await fn()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [])

  const exportNow = useCallback(
    () =>
      run(async () => {
        try {
          const res = await api.backup.export(dialogText(t, 'export'))
          if (res.status === 'saved') {
            setLastExport(res.export)
            setExportFailure(null)
          } else if (res.status === 'error') {
            setExportFailure(res)
          }
        } catch {
          setExportFailure(failure('write-failed'))
        }
      }),
    [run, t]
  )

  const pickRestore = useCallback(
    () =>
      run(async () => {
        try {
          const res = await api.backup.pick(dialogText(t, 'import'))
          if (res.status === 'ready') {
            setPickFailure(null)
            setFlow({ phase: 'preview', preview: res.preview })
          } else if (res.status === 'error') {
            setPickFailure(res)
          }
        } catch {
          setPickFailure(failure('read-failed'))
        }
      }),
    [run, t, setFlow]
  )

  const confirmRestore = useCallback(() => {
    const f = flowRef.current
    if (f.phase !== 'preview') return Promise.resolve()
    return run(async () => {
      setFlow({ phase: 'restoring', preview: f.preview })
      try {
        const res = await api.backup.restore(f.preview.token)
        if (res.status === 'restored') {
          reload() // także gdy ekran zdążył się odmontować — stan aplikacji jest już nieaktualny
          return
        }
        setFlow({ phase: 'failed', preview: f.preview, failure: res })
      } catch {
        setFlow({ phase: 'failed', preview: f.preview, failure: failure('restore-failed') })
      }
    })
  }, [run, reload, setFlow])

  const cancel = useCallback(() => {
    const f = flowRef.current
    if (f.phase === 'preview') {
      api.backup.discard(f.preview.token)
      setFlow({ phase: 'idle' })
    } else if (f.phase === 'failed') {
      setFlow({ phase: 'idle' })
    }
  }, [setFlow])

  return { lastExport, busy, exportFailure, pickFailure, flow, exportNow, pickRestore, confirmRestore, cancel }
}
