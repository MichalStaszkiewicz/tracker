/** Normalizacja URL do deduplikacji ofert. Czysta funkcja. */
export function normalizeUrl(url: string): string {
  let u = url.trim().toLowerCase()
  if (!u) return ''
  u = u.replace(/^https?:\/\//, '')
  u = u.replace(/^www\./, '')
  u = u.split(/[?#]/)[0] // odetnij query i hash
  u = u.replace(/\/+$/, '') // końcowe ukośniki
  return u
}

/** Domena z URL — do kolumny „źródło". */
export function urlHost(url: string): string {
  const n = normalizeUrl(url)
  return n.split('/')[0] ?? ''
}
