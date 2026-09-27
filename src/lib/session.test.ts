import { describe, expect, it } from 'vitest'
import { sessionElapsed } from './session'

const NOW = new Date('2026-09-27T10:00:00.000Z')

describe('sessionElapsed', () => {
  it('trwający odcinek: czas od startu', () => {
    expect(sessionElapsed('2026-09-27T09:59:30.000Z', 0, NOW)).toBe(30)
  })
  it('po wznowieniu: odcinki sprzed pauzy + bieżący', () => {
    expect(sessionElapsed('2026-09-27T09:59:30.000Z', 600, NOW)).toBe(630)
  })
  it('w pauzie licznik stoi', () => {
    expect(sessionElapsed(null, 600, NOW)).toBe(600)
  })
})
