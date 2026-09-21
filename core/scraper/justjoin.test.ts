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

  it('rzuca przy błędzie HTTP', async () => {
    const bad: FetchLike = async () => ({ ok: false, status: 403, json: async () => ({}) })
    await expect(
      fetchJustJoinOffers(CRITERIA, { fetch: bad, sleep: async () => {}, delayMs: 0 })
    ).rejects.toThrow(/403/)
  })
})
