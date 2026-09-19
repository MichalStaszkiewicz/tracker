import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api'
import type { Area } from '@shared/types'

export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([])
  const reload = useCallback(() => {
    void api.areas.list().then(setAreas)
  }, [])
  useEffect(reload, [reload])
  return { areas, reload }
}
