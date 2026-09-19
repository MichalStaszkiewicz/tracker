import { describe, it, expect } from 'vitest'
import { autoMapColumns, parseCsv } from './csv'
import { normalizeUrl, urlHost } from './url'

describe('parseCsv', () => {
  it('parsuje nagłówki i wiersze', () => {
    const { headers, rows } = parseCsv('firma,stanowisko\nNordwind,Fullstack\nBaltic,RN')
    expect(headers).toEqual(['firma', 'stanowisko'])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ firma: 'Nordwind', stanowisko: 'Fullstack' })
  })

  it('obsługuje cudzysłowy z przecinkiem i escape', () => {
    const { rows } = parseCsv('a,b\n"x, y","he said ""hi"""')
    expect(rows[0]).toEqual({ a: 'x, y', b: 'he said "hi"' })
  })

  it('pomija puste wiersze', () => {
    expect(parseCsv('a\n1\n\n2').rows).toHaveLength(2)
  })
})

describe('autoMapColumns', () => {
  it('mapuje typowe nagłówki', () => {
    const m = autoMapColumns(['Firma', 'Stanowisko', 'Widełki', 'URL', 'Tryb pracy', 'Lokalizacja'])
    expect(m).toEqual({
      Firma: 'company',
      Stanowisko: 'position',
      Widełki: 'salary',
      URL: 'url',
      'Tryb pracy': 'workMode',
      Lokalizacja: 'location'
    })
  })
  it('nieznane → pusty', () => {
    expect(autoMapColumns(['xyz'])).toEqual({ xyz: '' })
  })
})

describe('normalizeUrl', () => {
  it.each([
    ['https://JustJoin.it/offer/123/?utm=x', 'justjoin.it/offer/123'],
    ['http://www.justjoin.it/offer/123', 'justjoin.it/offer/123'],
    ['justjoin.it/offer/123#top', 'justjoin.it/offer/123']
  ])('%s → %s', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected)
  })
  it('urlHost zwraca domenę', () => {
    expect(urlHost('https://nofluffjobs.com/pl/job/abc')).toBe('nofluffjobs.com')
  })
  it('zachowuje istotny parametr query (różne oferty ≠ duplikat)', () => {
    expect(normalizeUrl('https://example.com/job?id=1')).not.toBe(normalizeUrl('https://example.com/job?id=2'))
  })
  it('usuwa parametry śledzące, zachowuje resztę', () => {
    expect(normalizeUrl('https://x.com/a?utm_source=li&gclid=9&id=5')).toBe('x.com/a?id=5')
  })
})
