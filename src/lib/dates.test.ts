import { describe, expect, it } from 'vitest'
import { relativeDay, weekdayDate } from './dates'

const NOW = new Date(2026, 8, 23, 10, 0, 0) // śr 2026-09-23

describe('dates (wyświetlanie)', () => {
  it('relativeDay', () => {
    expect(relativeDay('2026-09-23', NOW)).toBe('today')
    expect(relativeDay('2026-09-24', NOW)).toBe('tomorrow')
    expect(relativeDay('2026-09-22', NOW)).toBe('yesterday')
    expect(relativeDay('2026-09-30', NOW)).toBeNull()
  })

  it('weekdayDate zawiera krótką datę', () => {
    expect(weekdayDate('2026-09-25', 'pl')).toContain('25.09')
    expect(weekdayDate('2026-09-25', 'en')).toContain('25.09')
  })
})
