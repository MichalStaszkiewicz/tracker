import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api'
import type { RestoreNotice } from '@shared/types'

/** Komunikat po przywróceniu kopii (trzyma go proces główny — przeżywa przeładowanie renderera). */
export function useRestoreNotice(): { notice: RestoreNotice | null; dismiss(): void } {
  const [notice, setNotice] = useState<RestoreNotice | null>(null)

  useEffect(() => {
    let alive = true
    api.backup
      .status()
      .then((s) => {
        if (alive) setNotice(s.lastRestore)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const dismiss = useCallback(() => {
    api.backup.dismissNotice()
    setNotice(null)
  }, [])

  return { notice, dismiss }
}
