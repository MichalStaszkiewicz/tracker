import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api'
import type { EntryDetail } from '@shared/types'

export function useEntry(id: number) {
  const [detail, setDetail] = useState<EntryDetail | null>(null)

  const refetch = useCallback(async () => {
    setDetail(await api.entries.detail(id))
  }, [id])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { detail, refetch }
}
