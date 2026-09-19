import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, mergeSettings } from './settings'

describe('mergeSettings', () => {
  it('puste → domyślne', () => {
    expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS)
  })
  it('nadpisuje znane klucze', () => {
    const out = mergeSettings({ language: 'en', streakThresholdMinutes: 40 })
    expect(out.language).toBe('en')
    expect(out.streakThresholdMinutes).toBe(40)
    expect(out.defaultSessionMinutes).toBe(DEFAULT_SETTINGS.defaultSessionMinutes)
  })
  it('ignoruje nieznane i null', () => {
    const out = mergeSettings({ nieistnieje: 1, backup: null })
    expect(out).toEqual(DEFAULT_SETTINGS)
  })
})
