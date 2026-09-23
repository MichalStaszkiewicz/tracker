/** Wyświetlanie dat (renderer). Arytmetyka i gramatyka dat: @shared/dates. */

import { addDaysKey, fromDateKey, toDateKey } from '@shared/dates'
import { shortDate } from './format'

export type RelativeDay = 'yesterday' | 'today' | 'tomorrow'

export function relativeDay(key: string, now: Date = new Date()): RelativeDay | null {
  const today = toDateKey(now)
  if (key === today) return 'today'
  if (key === addDaysKey(today, 1)) return 'tomorrow'
  if (key === addDaysKey(today, -1)) return 'yesterday'
  return null
}

/** "pt 25.09" / "Fri 25.09" — dzień tygodnia + krótka data. */
export function weekdayDate(key: string, lang: 'pl' | 'en'): string {
  const wd = new Intl.DateTimeFormat(lang === 'pl' ? 'pl-PL' : 'en-US', { weekday: 'short' }).format(fromDateKey(key))
  return `${wd} ${shortDate(key)}`
}
