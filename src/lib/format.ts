/** Czyste formatowanie do wyświetlenia. Bez React, bez bazy. */

import type { Lang } from '@shared/types'

/** 9600 → "2h 40m", 3000 → "50m" */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds / 60))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m`
}

/** Sekundy → "42:17" lub "01:42:17" (stoper sesji). */
export function formatStopwatch(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}

/** Różnica w dniach kalendarzowych: dateKey (YYYY-MM-DD) − dziś. Ujemna = przeszłość. */
export function daysUntil(dateKey: string, now: Date = new Date()): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** "18.09" z dateKey. */
export function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  return `${d}.${m}`
}

/** Sekundy od znacznika ISO do teraz. */
export function secondsSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 1000))
}

/** Data i godzina do wyświetlenia (np. "21 paź 2026, 14:03"), w strefie lokalnej. */
export function formatDateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'pl' ? 'pl-PL' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso)
  )
}
