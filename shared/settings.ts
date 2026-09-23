import { DEFAULT_PROFILE, type ProfileData } from './profile'
import { TASK_GROUP_BYS, type Lang, type TaskGroupBy } from './types'

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
  /** Zapamiętane grupowanie listy zadań. */
  tasksGroupBy: TaskGroupBy
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
  profile: DEFAULT_PROFILE,
  tasksGroupBy: 'date'
}

/** Walidatory kluczy o zamkniętym zbiorze wartości — śmieć z bazy nie psuje widoku. */
const VALID: Partial<Record<string, (v: unknown) => boolean>> = {
  tasksGroupBy: (v) => typeof v === 'string' && (TASK_GROUP_BYS as readonly string[]).includes(v)
}

/** Nakłada zapisane wartości na domyślne (nieznane klucze i niepoprawne wartości ignoruje). Czysta. */
export function mergeSettings(raw: Record<string, unknown>): AppSettings {
  const out: AppSettings = { ...DEFAULT_SETTINGS }
  const writable = out as unknown as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = raw[key]
    if (value === undefined || value === null) continue
    const isValid = VALID[key]
    if (isValid && !isValid(value)) continue
    writable[key] = value
  }
  return out
}
