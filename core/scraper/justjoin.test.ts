import { describe, expect, it, vi } from 'vitest'
import type { ScrapeCriteria } from '@shared/types'
import { fetchJustJoinOffers, type FetchLike } from './justjoin'

function raw(cat: string, i: number, skill: string) {
  return {
    slug: `slug-${cat}-${i}`,
    title: `Developer ${i}`,
    companyName: `Company ${i}`,
    city: 'Warszawa',
    workplaceType: 'remote',
    experienceLevel: 'mid',
    employmentTypes: [],
    requiredSkills: [{ name: skill }],
    locations: []
  }
}

const DATA: Record<string, ReturnType<typeof raw>[]> = {
  javascript: Array.from({ length: 12 }, (_, i) => raw('javascript', i, 'React')),
  mobile: [raw('mobile', 0, 'React Native'), raw('mobile', 1, 'Swift')]
}

const makeFetch = (): FetchLike => async (url) => {
  const u = new URL(url)
  const cat = u.searchParams.get('categories') ?? ''
  const from = Number(u.searchParams.get('from') ?? '0')
  const all = DATA[cat] ?? []
  const data = all.slice(from, from + 10)
  return { ok: true, status: 200, json: async () => ({ data, meta: { totalItems: all.length } }) }
}

const CRITERIA: ScrapeCriteria = {
  categories: ['javascript', 'mobile'],
  keywords: ['react', 'node', 'typescript', 'react native'],
  maxPerCategory: 100
}

describe('fetchJustJoinOffers', () => {
  it('paginuje offsetem from, filtruje po słowach i mapuje na ImportOffer', async () => {
    const offers = await fetchJustJoinOffers(CRITERIA, { fetch: makeFetch(), sleep: async () => {}, delayMs: 0 })
    // 12 z javascript (React) + 1 z mobile (React Native); Swift odpada
    expect(offers).toHaveLength(13)
    expect(offers.every((o) => o.url?.startsWith('https://justjoin.it/job-offer/'))).toBe(true)
    expect(offers.some((o) => o.url?.includes('slug-mobile-0'))).toBe(true)
    expect(offers.some((o) => o.url?.includes('slug-mobile-1'))).toBe(false)
  })

  it('rate-limit: usypia między kolejnymi stronami tej samej kategorii', async () => {
    const sleep = vi.fn(async () => {})
    await fetchJustJoinOffers({ ...CRITERIA, categories: ['javascript'] }, { fetch: makeFetch(), sleep, delayMs: 5 })
    // javascript ma 2 strony → jedno uśpienie przed drugą stroną
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('pusta lista słów kluczowych przepuszcza wszystko', async () => {
    const offers = await fetchJustJoinOffers(
      { categories: ['mobile'], keywords: [], maxPerCategory: 100 },
      { fetch: makeFetch(), sleep: async () => {}, delayMs: 0 }
    )
    expect(offers).toHaveLength(2)
  })

  it('rzuca przy błędzie HTTP, gdy nic jeszcze nie zebrano', async () => {
    const bad: FetchLike = async () => ({ ok: false, status: 403, json: async () => ({}) })
    await expect(
      fetchJustJoinOffers(CRITERIA, { fetch: bad, sleep: async () => {}, delayMs: 0 })
    ).rejects.toThrow(/403/)
  })
})

// Fake fetch z surowych stron per kategoria (dane mogą zawierać śmieci; meta opcjonalne).
const fetchFrom = (dataByCat: Record<string, unknown[]>, opts: { meta?: boolean } = {}): FetchLike => async (url) => {
  const u = new URL(url)
  const cat = u.searchParams.get('categories') ?? ''
  const from = Number(u.searchParams.get('from') ?? '0')
  const all = dataByCat[cat] ?? []
  const body: Record<string, unknown> = { data: all.slice(from, from + 10) }
  if (opts.meta !== false) body.meta = { totalItems: all.length }
  return { ok: true, status: 200, json: async () => body }
}

const noKw: ScrapeCriteria = { categories: [], keywords: [], maxPerCategory: 100 }

describe('fetchJustJoinOffers — regresje z przeglądu', () => {
  it('śmieciowa pozycja na pełnej stronie NIE ucina paginacji (offset po rawCount)', async () => {
    const data = [{ junk: true }, ...Array.from({ length: 24 }, (_, i) => raw('x', i, 'React'))] // 25 pozycji, 1 śmieć
    const offers = await fetchJustJoinOffers(
      { ...noKw, categories: ['x'] },
      { fetch: fetchFrom({ x: data }), sleep: async () => {}, delayMs: 0 }
    )
    expect(offers).toHaveLength(24) // wszystkie poprawne, mimo śmiecia na stronie 1
  })

  it('brak meta.totalItems → paginuje aż do krótkiej strony (total = Infinity)', async () => {
    const data = Array.from({ length: 15 }, (_, i) => raw('y', i, 'React'))
    const offers = await fetchJustJoinOffers(
      { ...noKw, categories: ['y'] },
      { fetch: fetchFrom({ y: data }, { meta: false }), sleep: async () => {}, delayMs: 0 }
    )
    expect(offers).toHaveLength(15)
  })

  it('maxPerCategory ogranicza liczbę zmapowanych ofert (także nie-wielokrotność 10)', async () => {
    const data = Array.from({ length: 30 }, (_, i) => raw('z', i, 'React'))
    const offers = await fetchJustJoinOffers(
      { ...noKw, categories: ['z'], maxPerCategory: 25 },
      { fetch: fetchFrom({ z: data }), sleep: async () => {}, delayMs: 0 }
    )
    expect(offers).toHaveLength(25)
  })

  it('błąd HTTP na kolejnej kategorii zwraca oferty już zebrane (bez utraty przebiegu)', async () => {
    const jsData = Array.from({ length: 5 }, (_, i) => raw('javascript', i, 'React'))
    const partial: FetchLike = async (url) => {
      const u = new URL(url)
      if (u.searchParams.get('categories') === 'mobile') return { ok: false, status: 403, json: async () => ({}) }
      const from = Number(u.searchParams.get('from') ?? '0')
      return { ok: true, status: 200, json: async () => ({ data: jsData.slice(from, from + 10), meta: { totalItems: jsData.length } }) }
    }
    const offers = await fetchJustJoinOffers(
      { ...noKw, categories: ['javascript', 'mobile'] },
      { fetch: partial, sleep: async () => {}, delayMs: 0 }
    )
    expect(offers).toHaveLength(5)
  })

  it('rate-limit obejmuje granicę kategorii (jedno uśpienie między dwiema 1-stronicowymi kat.)', async () => {
    const sleep = vi.fn(async () => {})
    await fetchJustJoinOffers(
      { ...noKw, categories: ['a', 'b'] },
      { fetch: fetchFrom({ a: [raw('a', 0, 'React')], b: [raw('b', 0, 'React')] }), sleep, delayMs: 5 }
    )
    expect(sleep).toHaveBeenCalledTimes(1)
  })
})
