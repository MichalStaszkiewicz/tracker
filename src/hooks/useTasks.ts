import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api'
import type { TaskFilter, TaskListItem } from '@shared/types'

export function useTasks(filter: TaskFilter, refreshToken?: number) {
  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    const rows = await api.tasks.list(filter)
    setTasks(rows)
    setLoading(false)
    // refreshToken celowo w zależnościach: jego zmiana wymusza ponowny fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, refreshToken])

  useEffect(() => {
    setLoading(true)
    void refetch()
  }, [refetch])

  return { tasks, loading, refetch }
}
