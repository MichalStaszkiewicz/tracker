import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api'
import type { TaskFilter, TaskListItem } from '@shared/types'

export function useTasks(filter: TaskFilter) {
  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    const rows = await api.tasks.list(filter)
    setTasks(rows)
    setLoading(false)
  }, [filter])

  useEffect(() => {
    setLoading(true)
    void refetch()
  }, [refetch])

  return { tasks, loading, refetch }
}
