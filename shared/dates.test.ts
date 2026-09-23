import { describe, expect, it } from 'vitest'
import { addDaysKey, isDateKey, nextWeekdayKey, parseDateWord, toDateKey } from './dates'

const NOW = new Date(2026, 8, 23, 10, 0, 0) // śr 2026-09-23

describe('klucze dat', () => {
  it('toDateKey w czasie lokalnym', () => {
    expect(toDateKey(NOW)).toBe('2026-09-23')
  })

  it('addDaysKey przechodzi przez miesiąc i rok', () => {
    expect(addDaysKey('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDaysKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysKey('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('nextWeekdayKey: najbliższy przyszły dzień, dziś się nie liczy', () => {
    expect(nextWeekdayKey(NOW, 1)).toBe('2026-09-28') // pon
    expect(nextWeekdayKey(NOW, 3)).toBe('2026-09-30') // śr → za tydzień
  })

  it('isDateKey sprawdza istniejący dzień, nie tylko format', () => {
    expect(isDateKey('2026-09-23')).toBe(true)
    expect(isDateKey('2028-02-29')).toBe(true) // przestępny
    expect(isDateKey('23.09.2026')).toBe(false)
    expect(isDateKey('2026-02-31')).toBe(false)
    expect(isDateKey('2026-13-01')).toBe(false)
  })
})

describe('parseDateWord', () => {
  it.each([
    ['dziś', '2026-09-23'],
    ['DZIS', '2026-09-23'],
    ['jutro', '2026-09-24'],
    ['pojutrze', '2026-09-25'],
    ['pt', '2026-09-25'],
    ['śr', '2026-09-30'], // dziś środa → następna
    ['26.09', '2026-09-26'],
    ['26.09.', '2026-09-26'],
    ['23.09', '2026-09-23'], // dziś się liczy
    ['01.01', '2027-01-01'], // minęło → przyszły rok
    ['5.10.2027', '2027-10-05'],
    ['2026-10-01', '2026-10-01'],
    ['+3', '2026-09-26'], // za 3 dni
    ['+0', '2026-09-23']
  ])('%s → %s', (word, expected) => {
    expect(parseDateWord(word, NOW)).toBe(expected)
  })

  it.each(['31.02', '2026-02-31', '13.13', 'coś', ''])('odrzuca %s', (word) => {
    expect(parseDateWord(word, NOW)).toBeUndefined()
  })

  it('29.02 bez roku → najbliższy istniejący 29 lutego (regresja: rok przed przestępnym)', () => {
    expect(parseDateWord('29.02', new Date(2027, 4, 10))).toBe('2028-02-29')
    expect(parseDateWord('29.02', new Date(2028, 0, 10))).toBe('2028-02-29')
  })

  it.each([
    ['fri', '2026-09-25'],
    ['monday', '2026-09-28'],
    ['Tue', '2026-09-29'],
    ['sun', '2026-09-27']
  ])('angielski dzień tygodnia %s → %s', (word, expected) => {
    expect(parseDateWord(word, NOW)).toBe(expected)
  })
})
