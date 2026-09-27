import { isNotNull } from 'drizzle-orm'
import type { DB } from '../db/connection'
import { areas, entries, sessions } from '../db/schema'
import { getSetting } from './settings'
import type { StatsPeriod, StatsView } from '@shared/types'

const PERIOD_DAYS: Record<StatsPeriod, number> = { week: 7, month: 30, year: 365 }
const HEATMAP_DAYS = 126 // 18 tygodni

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function minutesBetween(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000))
}

/** Agregaty czasu z zakończonych sesji: streak, heatmapa, czas na obszar. */
export function getStats(db: DB, period: StatsPeriod, now: Date = new Date()): StatsView {
  const threshold = Number(getSetting(db, 'streakThresholdMinutes') ?? 25)
  const ended = db.select().from(sessions).where(isNotNull(sessions.endedAt)).all()
  const areaById = new Map(db.select().from(areas).all().map((a) => [a.id, a]))
  const entryArea = new Map(db.select().from(entries).all().map((e) => [e.id, e.areaId]))

  const perDay = new Map<string, number>()
  const areaMin = new Map<number | null, number>()
  const windowStart = startOfDay(addDays(now, -(PERIOD_DAYS[period] - 1)))
  const todayKey = dateKey(now)
  let periodMinutes = 0
  // Sesja = grupa odcinków (pauza/wznowienie dzieli ją na kilka wierszy) — liczymy grupy.
  const periodGroups = new Set<number>()
  let todayMinutes = 0

  for (const s of ended) {
    if (s.endedAt == null) continue
    const start = new Date(s.startedAt)
    const mins = minutesBetween(s.startedAt, s.endedAt)
    const key = dateKey(start)
    perDay.set(key, (perDay.get(key) ?? 0) + mins)
    if (key === todayKey) todayMinutes += mins
    if (start >= windowStart) {
      periodMinutes += mins
      periodGroups.add(s.groupId ?? s.id)
      const areaId = s.entryId != null ? entryArea.get(s.entryId) ?? null : null
      areaMin.set(areaId, (areaMin.get(areaId) ?? 0) + mins)
    }
  }

  // Streak: licz wstecz od dziś; jeśli dziś nie osiągnął progu, zacznij od wczoraj (fory na trwający dzień).
  let streakDays = 0
  let cursor = startOfDay(now)
  if ((perDay.get(dateKey(cursor)) ?? 0) < threshold) cursor = addDays(cursor, -1)
  while ((perDay.get(dateKey(cursor)) ?? 0) >= threshold) {
    streakDays++
    cursor = addDays(cursor, -1)
  }

  const heatmap: StatsView['heatmap'] = []
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const key = dateKey(addDays(now, -i))
    heatmap.push({ date: key, minutes: perDay.get(key) ?? 0 })
  }

  const sessionCount = periodGroups.size
  const areaTime: StatsView['areaTime'] = [...areaMin.entries()]
    .map(([areaId, minutes]) => {
      const a = areaId != null ? areaById.get(areaId) : undefined
      return { areaId, name: a?.name ?? '—', color: a?.color ?? null, minutes }
    })
    .sort((x, y) => y.minutes - x.minutes)

  return {
    streakDays,
    periodMinutes,
    sessionCount,
    avgSessionMinutes: sessionCount ? Math.round(periodMinutes / sessionCount) : 0,
    todayMinutes,
    heatmap,
    areaTime,
    thresholdMinutes: threshold
  }
}
