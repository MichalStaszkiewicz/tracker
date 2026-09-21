// Czysty parser/mapowanie ofert JustJoin.it — bez sieci (fetch mieszka w core/).
// Wejście → wyjście: surowa odpowiedź API → ImportOffer[]. Testowalne w izolacji.

import type { ImportOffer, ScrapeCriteria } from '../types'

export const JUSTJOIN_BASE = 'https://justjoin.it'
const API_PATH = '/api/candidate-api/offers'

// --- Kształt surowej odpowiedzi (tylko pola, których używamy) ---

export interface RawEmployment {
  from: number | null
  to: number | null
  currency: string
  currencySource: string
  type: string
  unit: string
  gross: boolean
}

export interface JustJoinRawOffer {
  slug: string
  title: string
  companyName: string
  city: string | null
  workplaceType: string
  experienceLevel: string
  employmentTypes: RawEmployment[]
  requiredSkills: { name: string }[]
  locations: { city: string }[]
}

/** Domyślne kryteria: JS/TS/React/Node/fullstack (kat. javascript) + React Native (kat. mobile). */
export const DEFAULT_JUSTJOIN_CRITERIA: ScrapeCriteria = {
  categories: ['javascript', 'mobile'],
  keywords: [
    'node',
    'fullstack',
    'full stack',
    'full-stack',
    'javascript',
    'typescript',
    'react',
    'react native',
    'react-native'
  ],
  experienceLevels: [],
  maxPerCategory: 100
}

// --- Zawężanie unknown (strict, bez any) ---

function isObj(u: unknown): u is Record<string, unknown> {
  return typeof u === 'object' && u !== null
}
function str(u: unknown): string {
  return typeof u === 'string' ? u : ''
}
function num(u: unknown): number | null {
  return typeof u === 'number' && Number.isFinite(u) ? u : null
}

function asEmployment(u: unknown): RawEmployment | null {
  if (!isObj(u)) return null
  return {
    from: num(u.from),
    to: num(u.to),
    currency: str(u.currency),
    currencySource: str(u.currencySource),
    type: str(u.type),
    unit: str(u.unit),
    gross: u.gross === true
  }
}

function asRawOffer(u: unknown): JustJoinRawOffer | null {
  if (!isObj(u)) return null
  const slug = str(u.slug)
  const title = str(u.title)
  if (!slug || !title) return null
  const employmentTypes = Array.isArray(u.employmentTypes)
    ? u.employmentTypes.map(asEmployment).filter((e): e is RawEmployment => e !== null)
    : []
  const requiredSkills = Array.isArray(u.requiredSkills)
    ? u.requiredSkills.map((s) => ({ name: isObj(s) ? str(s.name) : '' })).filter((s) => s.name)
    : []
  const locations = Array.isArray(u.locations)
    ? u.locations.map((l) => ({ city: isObj(l) ? str(l.city) : '' })).filter((l) => l.city)
    : []
  return {
    slug,
    title,
    companyName: str(u.companyName),
    city: typeof u.city === 'string' ? u.city : null,
    workplaceType: str(u.workplaceType),
    experienceLevel: str(u.experienceLevel),
    employmentTypes,
    requiredSkills,
    locations
  }
}

/** Rozpakowuje odpowiedź API do surowych ofert + łącznej liczby wyników. */
export function parseResponse(json: unknown): { offers: JustJoinRawOffer[]; total: number } {
  if (!isObj(json) || !Array.isArray(json.data)) {
    throw new Error('JustJoin: nieoczekiwany kształt odpowiedzi')
  }
  const offers = json.data.map(asRawOffer).filter((o): o is JustJoinRawOffer => o !== null)
  const meta = isObj(json.meta) ? json.meta : {}
  const total = num(meta.totalItems) ?? offers.length
  return { offers, total }
}

// --- Mapowanie na ImportOffer ---

export function offerUrl(slug: string): string {
  return `${JUSTJOIN_BASE}/job-offer/${slug}`
}

export function mapWorkplaceType(t: string): string {
  if (t === 'remote') return 'Zdalna'
  if (t === 'hybrid') return 'Hybrydowa'
  if (t === 'office') return 'Stacjonarna'
  return t
}

function groupThousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function unitShort(u: string): string {
  const k = u.toLowerCase()
  if (k === 'month') return 'mies.'
  if (k === 'hour') return 'godz.'
  if (k === 'day') return 'dzień'
  if (k === 'year') return 'rok'
  return u
}

function contractShort(type: string): string {
  const k = type.toLowerCase()
  if (k === 'b2b') return 'B2B'
  if (k === 'permanent') return 'UoP'
  if (k === 'mandate_contract' || k === 'mandate') return 'zlecenie'
  return ''
}

/** Widełki jako czytelny string; '' gdy nieujawnione. Preferuje PLN 'original'. */
export function formatSalary(employmentTypes: RawEmployment[]): string {
  const hasAmount = (e: RawEmployment) => e.from !== null || e.to !== null
  const pick =
    employmentTypes.find((e) => e.currency === 'PLN' && e.currencySource === 'original' && hasAmount(e)) ??
    employmentTypes.find((e) => e.currency === 'PLN' && hasAmount(e)) ??
    employmentTypes.find(hasAmount)
  if (!pick) return ''
  const range =
    pick.from !== null && pick.to !== null
      ? `${groupThousands(pick.from)}–${groupThousands(pick.to)}`
      : groupThousands((pick.from ?? pick.to) as number)
  const contract = contractShort(pick.type)
  const gross = pick.gross ? 'brutto' : 'netto'
  return `${range} ${pick.currency}/${unitShort(pick.unit)}${contract ? ` ${contract}` : ''} ${gross}`.trim()
}

export function mapOffer(raw: JustJoinRawOffer): ImportOffer {
  return {
    company: raw.companyName,
    position: raw.title.trim(),
    url: offerUrl(raw.slug),
    salary: formatSalary(raw.employmentTypes),
    workMode: mapWorkplaceType(raw.workplaceType),
    location: raw.city ?? raw.locations[0]?.city ?? ''
  }
}

/** Dopasowanie po słowach kluczowych do tytułu i wymaganych skilli (pusta lista = wszystko). */
export function matchesKeywords(raw: JustJoinRawOffer, keywords: string[]): boolean {
  if (keywords.length === 0) return true
  const hay = `${raw.title} ${raw.requiredSkills.map((s) => s.name).join(' ')}`.toLowerCase()
  return keywords.some((k) => hay.includes(k.toLowerCase()))
}

/** Ścieżka+query jednego żądania listy (jedna kategoria, offset `from`). */
export function buildOffersPath(opts: { category: string; from: number; experienceLevels?: string[] }): string {
  const params = [
    `categories=${encodeURIComponent(opts.category)}`,
    'sortBy=publishedAt',
    'orderBy=descending',
    `from=${opts.from}`,
    ...(opts.experienceLevels ?? []).map((l) => `experienceLevels=${encodeURIComponent(l)}`)
  ]
  return `${API_PATH}?${params.join('&')}`
}
