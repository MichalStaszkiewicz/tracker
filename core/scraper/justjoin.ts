// Pobieranie ofert z JustJoin.it (Node): paginacja offsetem `from`, uprzejmy rate-limit.
// Parsowanie/mapowanie jest czyste (shared/); tutaj tylko I/O sieciowe i orkiestracja.

import {
  JUSTJOIN_BASE,
  buildOffersPath,
  mapOffer,
  matchesKeywords,
  parseResponse
} from '@shared/scrapers/justjoin'
import type { ImportOffer, ScrapeCriteria } from '@shared/types'

/** Minimalny kontrakt fetch — bez zależności od typów DOM; wstrzykiwalny w testach. */
export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> }
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export interface FetchDeps {
  fetch?: FetchLike
  sleep?: (ms: number) => Promise<void>
  delayMs?: number
}

const PER_RESPONSE = 10 // API zwraca 10 ofert na żądanie
const GUARD_MAX_REQUESTS = 100 // bezpiecznik przed pętlą bez końca
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

/** Pobiera i mapuje oferty ze wszystkich kategorii kryteriów; dedup po URL w obrębie przebiegu. */
export async function fetchJustJoinOffers(criteria: ScrapeCriteria, deps: FetchDeps = {}): Promise<ImportOffer[]> {
  const doFetch: FetchLike = deps.fetch ?? (globalThis.fetch as unknown as FetchLike)
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const delayMs = deps.delayMs ?? 300
  const maxPerCategory = criteria.maxPerCategory ?? 100

  const byUrl = new Map<string, ImportOffer>()
  let sentAny = false // throttling liczone dla całego przebiegu (także między kategoriami)

  categories: for (const category of criteria.categories) {
    let from = 0
    for (let req = 0; req < GUARD_MAX_REQUESTS; req++) {
      if (from >= maxPerCategory) break
      if (sentAny) await sleep(delayMs)
      sentAny = true

      const url = JUSTJOIN_BASE + buildOffersPath({ category, from, experienceLevels: criteria.experienceLevels })
      const res = await doFetch(url, { headers: { accept: 'application/json', 'user-agent': UA } })
      if (!res.ok) {
        // Mamy już oferty z wcześniejszych stron/kategorii → zwróć je zamiast tracić cały przebieg.
        if (byUrl.size > 0) break categories
        throw new Error(`JustJoin (${category}): HTTP ${res.status}`)
      }

      // rawCount steruje paginacją (offset), offers to odsiane pozycje do zmapowania.
      const { offers, rawCount, total } = parseResponse(await res.json())
      if (rawCount === 0) break

      const room = maxPerCategory - from // nie przekraczaj deklarowanego capa kategorii
      for (const raw of offers.slice(0, Math.max(0, room))) {
        if (!matchesKeywords(raw, criteria.keywords)) continue
        const offer = mapOffer(raw)
        if (offer.url) byUrl.set(offer.url, offer)
      }

      from += rawCount
      if (from >= total || from >= maxPerCategory || rawCount < PER_RESPONSE) break
    }
  }

  return [...byUrl.values()]
}
