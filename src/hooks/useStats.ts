import { useEffect, useState } from 'react'
import { api } from '@/api'
import type { StatsPeriod, StatsView } from '@shared/types'

const EMPTY: StatsView = {
  streakDays: 0,
  periodMinutes: 0,
  sessionCount: 0,
  avgSessionMinutes: 0,
  todayMinutes: 0,
  heatmap: [],
  areaTime: [],
  thresholdMinutes: 25
}

export function useStats(period: StatsPeriod) {
  const [stats, setStats] = useState<StatsView>(EMPTY)
  useEffect(() => {
    void api.stats.get(period).then(setStats)
  }, [period])
  return stats
}
