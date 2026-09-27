import { useEffect, useState } from 'react'
import { api } from '@/api'
import { isDone } from '@/lib/task-view'

export interface PickItem {
  id: number
  title: string
  icon: string
  areaColor: string | null
}

const LIMIT = 8

/**
 * Kandydaci do wyboru zadania: pusta fraza → niezrobione aktywne zadania w ręcznej kolejności,
 * fraza → wyszukiwanie po tytule (to samo, co paleta Ctrl+K).
 */
export function useEntryPicker(query: string): PickItem[] {
  const [items, setItems] = useState<PickItem[]>([])

  useEffect(() => {
    let alive = true
    const q = query.trim()
    const load: Promise<PickItem[]> = q
      ? api.entries.search(q).then((rs) => rs.map((r) => ({ id: r.id, title: r.title, icon: r.icon, areaColor: r.areaColor })))
      : api.tasks
          .list('active')
          .then((ts) =>
            ts.filter((t) => !isDone(t)).map((t) => ({ id: t.id, title: t.title, icon: t.type.icon, areaColor: t.area?.color ?? null }))
          )
    void load.then((list) => alive && setItems(list.slice(0, LIMIT)))
    return () => {
      alive = false
    }
  }, [query])

  return items
}
