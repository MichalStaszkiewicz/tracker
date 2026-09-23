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
    ['@2026-12-01', '2026-12-01'],
    ['@25.09', '2026-09-25'], // polski DD.MM — bieżący rok
    ['@5.10', '2026-10-05'],
    ['@14.09', '2026-09-14'], // dziś się liczy
    ['@03.01', '2027-01-03'], // bez roku i już minęło → przyszły rok
    ['@01.02.2027', '2027-02-01'] // DD.MM.RRRR — dokładnie
  ])('parsuje datę %s → %s', (token, expected) => {
    expect(parseQuickAdd(`x ${token}`, NOW).plannedDate).toBe(expected)
  })

  it.each(['@31.02', '@13.13', '@0.05', '@32.01.2027'])('odrzuca nieistniejącą datę %s', (token) => {
    expect(parseQuickAdd(`x ${token}`, NOW).plannedDate).toBeUndefined()
  })

  // Regresja: „@pon asd" dawało pusty tytuł (asd wpadało do wartości daty) → tytuł = surowa linia.
  it.each([
    ['@pon asd', 'asd', { plannedDate: '2026-09-21' }],
    ['Kupić mleko @jutro rano', 'Kupić mleko rano', { plannedDate: '2026-09-15' }],
    ['@ jutro coś', 'coś', { plannedDate: '2026-09-15' }],
    ['!2 pilne zadanie', 'pilne zadanie', { priority: 2 }],
    ['/note Pomysł na apkę', 'Pomysł na apkę', { typeKey: 'note' }]
  ])('znaczniki jednowyrazowe (@ / !) nie połykają tytułu: %s', (line, title, extra) => {
    const r = parseQuickAdd(line, NOW)
    expect(r.title).toBe(title)
    expect(r).toMatchObject(extra)
  })

  it('#tag i >rodzic nadal mogą mieć wiele słów', () => {
    const r = parseQuickAdd('x #heap exploitation >Parser PE w C++', NOW)
    expect(r.tags).toEqual([{ name: 'heap exploitation' }])
    expect(r.parent).toBe('Parser PE w C++')
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
