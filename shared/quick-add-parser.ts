// Czysta funkcja parsera składni szybkiego dodawania.
// Model marker-delimitowany: słowa poza dyrektywami tworzą tytuł. Wartość
// #tagu i >rodzica ciągnie się do następnego znacznika (mogą mieć wiele słów:
// ">Parser PE w C++", "#heap exploitation"); /typ, !priorytet i @data biorą
// jedno słowo, a dalszy tekst wraca do tytułu ("@pon asd" → tytuł "asd").
//
//   /typ        typ wpisu (pierwsze słowo)
//   #tag        tag, opcjonalnie z grupą: #grupa:nazwa
//   >rodzic     rodzic (może mieć spacje)
//   !priorytet  1..3
//   @data       dziś | jutro | pojutrze | pon..nd | DD.MM[.RRRR] | RRRR-MM-DD  (gramatyka: ./dates)

import { parseDateWord } from './dates'

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

export type Marker = '/' | '#' | '>' | '!' | '@'
const MARKERS = new Set<string>(['/', '#', '>', '!', '@'])
/** Znaczniki z jednowyrazową wartością; #tag i >rodzic mogą mieć wiele słów. */
const SINGLE_WORD = new Set<string>(['/', '!', '@'])

export interface ActiveToken {
  marker: '/' | '#' | '>' | '@' // '!' nie ma podpowiedzi
  query: string
  start: number // indeks znacznika w wejściu
}

interface Directive {
  marker: string
  value: string
}

export function parseQuickAdd(input: string, now: Date = new Date()): ParsedQuickAdd {
  const result: ParsedQuickAdd = { title: '', tags: [] }
  const titleWords: string[] = []
  const directives: Directive[] = []
  let current: Directive | null = null

  for (const token of input.trim().split(/\s+/).filter(Boolean)) {
    if (MARKERS.has(token[0])) {
      current = { marker: token[0], value: token.slice(1) }
      directives.push(current)
      // /typ, !prio, @data mają jedno słowo — dalszy tekst wraca do tytułu („@pon asd" → „asd").
      if (SINGLE_WORD.has(current.marker) && current.value) current = null
    } else if (current) {
      current.value = current.value ? `${current.value} ${token}` : token
      if (SINGLE_WORD.has(current.marker)) current = null // „@ jutro" — wartość po spacji
    } else {
      titleWords.push(token)
    }
  }

  result.title = titleWords.join(' ')

  for (const d of directives) {
    const value = d.value.trim()
    switch (d.marker) {
      case '/':
        if (value && !result.typeKey) result.typeKey = firstWord(value).toLowerCase()
        break
      case '#':
        if (value) result.tags.push(parseTag(value))
        break
      case '>':
        if (value && !result.parent) result.parent = value
        break
      case '!': {
        const p = Number(firstWord(value))
        if (p >= 1 && p <= 3) result.priority = p
        break
      }
      case '@': {
        const date = parseDateWord(firstWord(value), now)
        if (date) result.plannedDate = date
        break
      }
    }
  }

  return result
}

/** Znacznik aktualnie pisany pod kursorem — do autouzupełniania. */
export function activeToken(input: string, caret: number): ActiveToken | null {
  const end = Math.max(0, Math.min(caret, input.length))
  if (end > 0 && /\s/.test(input[end - 1])) return null // po spacji token domknięty

  const before = input.slice(0, end)
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i]
    if (MARKERS.has(ch) && (i === 0 || /\s/.test(before[i - 1]))) {
      if (ch === '!') return null
      return { marker: ch as ActiveToken['marker'], query: before.slice(i + 1), start: i }
    }
  }
  return null
}

/** Zastępuje pisany token wybraną wartością i dokleja spację. */
export function applySuggestion(
  input: string,
  active: ActiveToken,
  value: string
): { text: string; caret: number } {
  const caretInToken = active.start + 1 + active.query.length
  const insert = `${active.marker}${value} `
  return {
    text: input.slice(0, active.start) + insert + input.slice(caretInToken),
    caret: active.start + insert.length
  }
}

function firstWord(v: string): string {
  return v.split(/\s+/)[0] ?? ''
}

function parseTag(raw: string): ParsedTag {
  const idx = raw.indexOf(':')
  if (idx > 0) {
    return { group: raw.slice(0, idx).toLowerCase(), name: raw.slice(idx + 1).trim() }
  }
  return { name: raw }
}
