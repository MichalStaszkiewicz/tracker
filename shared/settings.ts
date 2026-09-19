import { DEFAULT_PROFILE, type ProfileData } from './profile'
import type { Lang } from './types'

export interface AppSettings {
  language: Lang
  theme: 'dark' | 'light' | 'system'
  accent: string
  font: 'inter' | 'system' | 'mono'
  density: 'compact' | 'comfortable'
  monoNumbers: boolean
  shortcuts: Record<string, string>
  streakThresholdMinutes: number
  defaultSessionMinutes: number
  autoPause: boolean
  askUnclosedSession: boolean
  countActiveWindowOnly: boolean
  backup: boolean
  profile: ProfileData
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'pl',
  theme: 'dark',
  accent: 'mono',
  font: 'inter',
  density: 'compact',
  monoNumbers: true,
  shortcuts: {},
  streakThresholdMinutes: 25,
  defaultSessionMinutes: 50,
  autoPause: true,
  askUnclosedSession: true,
  countActiveWindowOnly: false,
  backup: true,
  profile: DEFAULT_PROFILE
}

/** Nakłada zapisane wartości na domyślne (nieznane klucze ignoruje). Czysta. */
export function mergeSettings(raw: Record<string, unknown>): AppSettings {
  const out: AppSettings = { ...DEFAULT_SETTINGS }
  const writable = out as unknown as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = raw[key]
    if (value !== undefined && value !== null) writable[key] = value
  }
  return out
}
