// Czysta funkcja parsera składni szybkiego dodawania.
// Składnia (raport 5.2):
//   /typ        typ wpisu
//   #tag        tag, opcjonalnie z grupą: #grupa:nazwa
//   >rodzic     rodzic (projekt/kurs)
//   !priorytet  1..3
//   @data       dziś | jutro | pon..nd | YYYY-MM-DD

export interface ParsedTag {
  group?: string
  name: string
}

export interface ParsedQuickAdd {
  title: string
  typeKey?: string
  tags: ParsedTag[]
  parent?: string
  priority?: number
  plannedDate?: string // YYYY-MM-DD
}

const WEEKDAYS: Record<string, number> = {
  // 0 = niedziela ... 6 = sobota (zgodnie z Date.getDay)
  nd: 0, niedziela: 0,
  pon: 1, pn: 1, poniedzialek: 1, poniedziałek: 1,
  wt: 2, wtorek: 2,
  sr: 3, śr: 3, sroda: 3, środa: 3,
  czw: 4, czwartek: 4,
  pt: 5, piatek: 5, piątek: 5,
  sob: 6, sobota: 6
}

export function parseQuickAdd(input: string, now: Date = new Date()): ParsedQuickAdd {
  const result: ParsedQuickAdd = { title: '', tags: [] }
  const titleWords: string[] = []

  for (const token of input.trim().split(/\s+/).filter(Boolean)) {
    const marker = token[0]
    const rest = token.slice(1)

    switch (marker) {
      case '/':
        if (rest && !result.typeKey) result.typeKey = rest.toLowerCase()
        break
      case '#':
        if (rest) result.tags.push(parseTag(rest))
        break
      case '>':
        if (rest && !result.parent) result.parent = rest
        break
      case '!': {
        const p = Number(rest)
        if (p >= 1 && p <= 3) result.priority = p
        break
      }
      case '@': {
        const d = parseDate(rest, now)
        if (d) result.plannedDate = d
        break
      }
      default:
        titleWords.push(token)
    }
  }

  result.title = titleWords.join(' ')
  return result
}

function parseTag(raw: string): ParsedTag {
  const idx = raw.indexOf(':')
  if (idx > 0) {
    return { group: raw.slice(0, idx).toLowerCase(), name: raw.slice(idx + 1) }
  }
  return { name: raw }
}

function parseDate(raw: string, now: Date): string | undefined {
  const key = raw.toLowerCase()
  if (key === 'dzis' || key === 'dziś' || key === 'today') return fmt(now)
  if (key === 'jutro' || key === 'tomorrow') return fmt(addDays(now, 1))
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const wd = WEEKDAYS[key]
  if (wd !== undefined) return fmt(nextWeekday(now, wd))
  return undefined
}

function nextWeekday(from: Date, target: number): Date {
  const diff = (target - from.getDay() + 7) % 7 || 7 // zawsze najbliższy PRZYSZŁY
  return addDays(from, diff)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
