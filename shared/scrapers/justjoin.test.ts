import { describe, expect, it } from 'vitest'
import {
  DEFAULT_JUSTJOIN_CRITERIA,
  formatSalary,
  mapOffer,
  mapWorkplaceType,
  matchesKeywords,
  offerUrl,
  parseResponse,
  type JustJoinRawOffer
} from './justjoin'

const jsOffer = {
  slug: 'wingspan-software-engineer-warszawa-javascript-af05ef8a',
  title: 'Software Engineer, Payment Operations ',
  companyName: 'Wingspan',
  city: 'Warszawa',
  workplaceType: 'remote',
  experienceLevel: 'mid',
  employmentTypes: [
    { from: null, to: null, currency: 'EUR', currencySource: 'conversion', type: 'b2b', unit: 'Month', gross: false },
    { from: 19800, to: 24200, currency: 'PLN', currencySource: 'original', type: 'b2b', unit: 'Month', gross: false }
  ],
  requiredSkills: [{ name: 'TypeScript' }, { name: 'Node.js' }, { name: 'MongoDB' }],
  locations: [{ city: 'Warszawa' }]
}

const iosOffer = {
  slug: 'acme-ios-developer-krakow-mobile-1234abcd',
  title: 'iOS Developer',
  companyName: 'Acme',
  city: null,
  workplaceType: 'office',
  experienceLevel: 'senior',
  employmentTypes: [],
  requiredSkills: [{ name: 'Swift' }, { name: 'Kotlin' }],
  locations: [{ city: 'Kraków' }]
}

const apiResponse = { data: [jsOffer, iosOffer, { junk: true }], meta: { totalItems: 42 } }

describe('parseResponse', () => {
  it('rozpakowuje oferty i total, pomija śmieciowe wpisy', () => {
    const { offers, total } = parseResponse(apiResponse)
    expect(total).toBe(42)
    expect(offers.map((o) => o.slug)).toEqual([jsOffer.slug, iosOffer.slug])
  })

  it('rzuca przy nieoczekiwanym kształcie', () => {
    expect(() => parseResponse({ nope: 1 })).toThrow()
  })
})

describe('mapOffer', () => {
  it('mapuje na ImportOffer z URL, widełkami i trybem pracy', () => {
    const o = mapOffer(jsOffer as JustJoinRawOffer)
    expect(o.company).toBe('Wingspan')
    expect(o.position).toBe('Software Engineer, Payment Operations')
    expect(o.url).toBe(offerUrl(jsOffer.slug))
    expect(o.url).toContain('https://justjoin.it/job-offer/')
    expect(o.workMode).toBe('Zdalna')
    expect(o.location).toBe('Warszawa')
    expect(o.salary).toBe('19 800–24 200 PLN/mies. B2B netto')
  })

  it('bierze miasto z locations, gdy city jest null', () => {
    expect(mapOffer(iosOffer as JustJoinRawOffer).location).toBe('Kraków')
  })
})

describe('formatSalary', () => {
  it('preferuje PLN original i formatuje zakres', () => {
    expect(formatSalary(jsOffer.employmentTypes)).toBe('19 800–24 200 PLN/mies. B2B netto')
  })
  it('puste, gdy brak kwot', () => {
    expect(formatSalary([])).toBe('')
    expect(formatSalary(iosOffer.employmentTypes)).toBe('')
  })
  it('pojedyncza kwota, gdy tylko from lub to', () => {
    expect(formatSalary([{ from: 15000, to: null, currency: 'PLN', currencySource: 'original', type: 'permanent', unit: 'Month', gross: true }])).toBe(
      '15 000 PLN/mies. UoP brutto'
    )
  })
})

describe('mapWorkplaceType', () => {
  it('tłumaczy tryby', () => {
    expect(mapWorkplaceType('remote')).toBe('Zdalna')
    expect(mapWorkplaceType('hybrid')).toBe('Hybrydowa')
    expect(mapWorkplaceType('office')).toBe('Stacjonarna')
  })
})

describe('matchesKeywords', () => {
  const kw = DEFAULT_JUSTJOIN_CRITERIA.keywords
  it('dopuszcza ofertę ze skillem TypeScript/Node.js', () => {
    expect(matchesKeywords(jsOffer as JustJoinRawOffer, kw)).toBe(true)
  })
  it('odrzuca ofertę bez pasujących skilli/tytułu (iOS/Swift/Kotlin)', () => {
    expect(matchesKeywords(iosOffer as JustJoinRawOffer, kw)).toBe(false)
  })
  it('pusta lista słów = wszystko przechodzi', () => {
    expect(matchesKeywords(iosOffer as JustJoinRawOffer, [])).toBe(true)
  })
})
