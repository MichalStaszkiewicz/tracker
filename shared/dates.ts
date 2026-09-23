// Czyste operacje na datach jako kluczach YYYY-MM-DD (czas lokalny) + gramatyka słów daty.
// Jedno źródło dla parsera szybkiego dodawania, DatePickera, core i widoków listy.

export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Poprawny klucz YYYY-MM-DD istniejącego dnia (odrzuca 2026-02-31, miesiąc 13…). */
export function isDateKey(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  return m !== null && validKey(Number(m[1]), Number(m[2]), Number(m[3])) === s
}

/** Przesunięcie klucza o n dni (przez miesiąc/rok i zmianę czasu). */
export function addDaysKey(key: string, n: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

/** Najbliższy PRZYSZŁY dzień tygodnia (0 = nd … 6 = sob); dziś się nie liczy. */
export function nextWeekdayKey(now: Date, weekday: number): string {
  const diff = (weekday - now.getDay() + 7) % 7 || 7
  return addDaysKey(toDateKey(now), diff)
}

const WEEKDAYS: Record<string, number> = {
  nd: 0, niedziela: 0, sun: 0, sunday: 0,
  pon: 1, pn: 1, poniedzialek: 1, poniedziałek: 1, mon: 1, monday: 1,
  wt: 2, wtorek: 2, tue: 2, tues: 2, tuesday: 2,
  sr: 3, śr: 3, sroda: 3, środa: 3, wed: 3, wednesday: 3,
  czw: 4, czwartek: 4, thu: 4, thur: 4, thurs: 4, thursday: 4,
  pt: 5, piatek: 5, piątek: 5, fri: 5, friday: 5,
  sob: 6, sobota: 6, sat: 6, saturday: 6
}

/** Klucz tylko dla istniejącej daty (odrzuca 31.02, 2026-02-31, miesiąc 13…). */
function validKey(y: number, m: number, d: number): string | undefined {
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? toDateKey(date) : undefined
}

/**
 * Słowo daty → klucz YYYY-MM-DD:
 * dziś | jutro | pojutrze | +N (za N dni) | pon..nd (najbliższy przyszły) | DD.MM[.RRRR] | RRRR-MM-DD.
 * DD.MM bez roku: bieżący rok, a jeśli ta data już minęła — następny. Nierozpoznane → undefined.
 */
export function parseDateWord(raw: string, now: Date = new Date()): string | undefined {
  const word = raw.trim()
  const key = word.toLowerCase()
  const today = toDateKey(now)
  if (key === 'dzis' || key === 'dziś' || key === 'today') return today
  if (key === 'jutro' || key === 'tomorrow') return addDaysKey(today, 1)
  if (key === 'pojutrze') return addDaysKey(today, 2)

  const plus = /^\+(\d{1,3})$/.exec(word) // „+3" = za 3 dni
  if (plus) return addDaysKey(today, Number(plus[1]))

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(word)
  if (iso) return validKey(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const dm = /^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\.?$/.exec(word)
  if (dm) {
    const day = Number(dm[1])
    const month = Number(dm[2])
    if (dm[3]) return validKey(Number(dm[3]), month, day)
    // Najbliższe wystąpienie od dziś (29.02 może być dopiero za kilka lat).
    for (let y = now.getFullYear(); y <= now.getFullYear() + 4; y++) {
      const key = validKey(y, month, day)
      if (key && key >= today) return key
    }
    return undefined
  }

  const wd = WEEKDAYS[key]
  if (wd !== undefined) return nextWeekdayKey(now, wd)
  return undefined
}
