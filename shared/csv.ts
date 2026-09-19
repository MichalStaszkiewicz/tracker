// Czysty parser CSV (obsługuje cudzysłowy, przecinki w polach, "" jako escape, CRLF)
// oraz auto-mapowanie kolumn na pola oferty.

export interface CsvData {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsv(text: string): CsvData {
  const table: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
      continue
    }
    if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      table.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    table.push(row)
  }

  const headerRow = table.shift() ?? []
  const headers = headerRow.map((h) => h.trim())
  const rows = table
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])))
  return { headers, rows }
}

export type OfferField = 'company' | 'position' | 'salary' | 'workMode' | 'location' | 'url'

const MATCHERS: [OfferField, RegExp][] = [
  ['company', /(firm|company|pracodaw)/i],
  ['position', /(stanow|position|title|role|tytu)/i],
  ['salary', /(wide[łl]|salary|pay|wynagrodz|zarob)/i],
  ['workMode', /(tryb|mode|remote|zdaln)/i],
  ['location', /(lokaliz|location|city|miast|miejsc)/i],
  ['url', /(url|link|adres|offer)/i]
]

/** Zgaduje mapowanie nagłówków CSV na pola oferty; nieznane → ''. */
export function autoMapColumns(headers: string[]): Record<string, OfferField | ''> {
  const used = new Set<OfferField>()
  const map: Record<string, OfferField | ''> = {}
  for (const h of headers) {
    const hit = MATCHERS.find(([field, re]) => !used.has(field) && re.test(h))
    if (hit) {
      map[h] = hit[0]
      used.add(hit[0])
    } else {
      map[h] = ''
    }
  }
  return map
}
