import { useEffect, useState } from 'react'
import { api } from '@/api'
import type { Area } from '@shared/types'

export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([])
  useEffect(() => {
    void api.areas.list().then(setAreas)
  }, [])
  return areas
}
