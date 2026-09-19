import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api'
import type { BoardView, EntryType } from '@shared/types'

export function useBoardTypes() {
  const [types, setTypes] = useState<EntryType[]>([])
  useEffect(() => {
    void api.board.types().then(setTypes)
  }, [])
  return types
}

export function useBoard(typeId: number | null) {
  const [view, setView] = useState<BoardView>({ stages: [], cards: [] })

  const refetch = useCallback(async () => {
    if (typeId == null) {
      setView({ stages: [], cards: [] })
      return
    }
    setView(await api.board.view(typeId))
  }, [typeId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { view, refetch }
}
