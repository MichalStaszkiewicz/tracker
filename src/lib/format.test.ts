import { describe, it, expect } from 'vitest'
import { daysUntil, formatDateTime, formatDuration, formatStopwatch, shortDate } from './format'

describe('formatDuration', () => {
  it.each([
    [9600, '2h 40m'],
    [3000, '50m'],
    [3900, '1h 05m'],
    [0, '0m']
  ])('%i s → %s', (s, expected) => {
    expect(formatDuration(s)).toBe(expected)
  })
})

describe('formatStopwatch', () => {
  it('mm:ss poniżej godziny', () => {
    expect(formatStopwatch(42 * 60 + 17)).toBe('42:17')
  })
  it('hh:mm:ss powyżej godziny', () => {
    expect(formatStopwatch(3600 + 42 * 60 + 17)).toBe('01:42:17')
  })
})

describe('daysUntil / shortDate', () => {
  const now = new Date(2026, 8, 18)
  it('liczy dni do przodu i wstecz', () => {
    expect(daysUntil('2026-09-19', now)).toBe(1)
    expect(daysUntil('2026-09-16', now)).toBe(-2)
    expect(daysUntil('2026-09-18', now)).toBe(0)
  })
  it('shortDate formatuje DD.MM', () => {
    expect(shortDate('2026-09-18')).toBe('18.09')
  })
})

describe('formatDateTime', () => {
  it('pl i en w lokalnej strefie: rok i godzina', () => {
    const iso = new Date(2026, 9, 21, 14, 3).toISOString()
    const pl = formatDateTime(iso, 'pl')
    const en = formatDateTime(iso, 'en')
    expect(pl).toContain('2026')
    expect(pl).toContain('14:03')
    expect(en).toContain('2026')
    expect(en).toContain('14:03')
    expect(pl).not.toBe(en)
  })
})
