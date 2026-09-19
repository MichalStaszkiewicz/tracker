import { describe, it, expect } from 'vitest'
import { parseQuickAdd } from './quick-add-parser'

// Poniedziałek 2026-09-14 jako stały „teraz" dla dat względnych.
const NOW = new Date(2026, 8, 14, 10, 0, 0)

describe('parseQuickAdd', () => {
  it('gołe słowa to tytuł', () => {
    expect(parseQuickAdd('Przeczytać RFC 793').title).toBe('Przeczytać RFC 793')
  })

  it('wyciąga typ, tag, rodzica i datę z jednej linii', () => {
    const r = parseQuickAdd('babyheap level 3 /pwn #heap >pwn.college @dziś', NOW)
    expect(r.title).toBe('babyheap level 3')
    expect(r.typeKey).toBe('pwn')
    expect(r.tags).toEqual([{ name: 'heap' }])
    expect(r.parent).toBe('pwn.college')
    expect(r.plannedDate).toBe('2026-09-14')
  })

  it('tag z grupą rozdziela grupę i nazwę', () => {
    expect(parseQuickAdd('x #lang:cpp').tags).toEqual([{ group: 'lang', name: 'cpp' }])
  })

  it('bierze pierwszy typ i pierwszego rodzica, ignoruje kolejne', () => {
    const r = parseQuickAdd('x /pwn /crackme >a >b')
    expect(r.typeKey).toBe('pwn')
    expect(r.parent).toBe('a')
  })

  it.each([
    ['@dzis', '2026-09-14'],
    ['@jutro', '2026-09-15'],
    ['@pt', '2026-09-18'],
    ['@pon', '2026-09-21'], // najbliższy PRZYSZŁY poniedziałek, nie dzisiejszy
    ['@2026-12-01', '2026-12-01']
  ])('parsuje datę %s → %s', (token, expected) => {
    expect(parseQuickAdd(`x ${token}`, NOW).plannedDate).toBe(expected)
  })

  it.each([
    ['!1', 1],
    ['!3', 3]
  ])('parsuje priorytet %s', (token, expected) => {
    expect(parseQuickAdd(`x ${token}`).priority).toBe(expected)
  })

  it('odrzuca priorytet spoza 1..3', () => {
    expect(parseQuickAdd('x !5').priority).toBeUndefined()
  })

  it('wiele tagów zachowuje kolejność', () => {
    expect(parseQuickAdd('x #a #tech:nestjs #b').tags).toEqual([
      { name: 'a' },
      { group: 'tech', name: 'nestjs' },
      { name: 'b' }
    ])
  })

  it('puste wejście daje pusty tytuł i brak tagów', () => {
    const r = parseQuickAdd('   ')
    expect(r.title).toBe('')
    expect(r.tags).toEqual([])
  })
})
