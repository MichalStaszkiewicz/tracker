// Normalizacja URL do deduplikacji ofert. Czysta funkcja.
// Zasada: usuwaj tylko szum (protokół, www, hash, parametry śledzące, końcowe /),
// ale ZACHOWUJ tożsamość oferty (ścieżkę z jej wielkością liter i istotne parametry query),
// żeby nie sklejać różnych ofert w jeden klucz.

const TRACKING = new Set(['gclid', 'fbclid', 'ref', 'mc_cid', 'mc_eid', 'igshid'])
const isTracking = (key: string): boolean => key.startsWith('utm') || TRACKING.has(key)

export function normalizeUrl(url: string): string {
  let u = url.trim()
  if (!u) return ''
  u = u.replace(/^https?:\/\//i, '')
  u = u.replace(/^www\./i, '')
  u = u.split('#')[0] // odetnij hash

  const qi = u.indexOf('?')
  const beforeQuery = qi === -1 ? u : u.slice(0, qi)
  const queryStr = qi === -1 ? '' : u.slice(qi + 1)

  const slash = beforeQuery.indexOf('/')
  const host = (slash === -1 ? beforeQuery : beforeQuery.slice(0, slash)).toLowerCase()
  const path = (slash === -1 ? '' : beforeQuery.slice(slash)).replace(/\/+$/, '')

  let query = ''
  if (queryStr) {
    const kept = queryStr
      .split('&')
      .filter((kv) => kv !== '' && !isTracking(kv.split('=')[0].toLowerCase()))
      .sort()
    if (kept.length > 0) query = `?${kept.join('&')}`
  }

  return host + path + query
}

/** Domena z URL — do kolumny „źródło". */
export function urlHost(url: string): string {
  const n = normalizeUrl(url)
  return n.split(/[/?]/)[0] ?? ''
}
