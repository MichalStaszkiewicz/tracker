// Dopasowanie rozmyte do podpowiedzi. Czysta funkcja.
// Zwraca wynik (im wyższy, tym lepiej) albo null, gdy query nie jest podciągiem text.

export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase()
  const t = text.toLowerCase()
  if (q === '') return 1 // pusty query pasuje do wszystkiego (niski priorytet)
  if (t.includes(q)) {
    // ciągłe trafienie: premia za prefiks
    return 100 + (t.startsWith(q) ? 50 : 0) - t.indexOf(q)
  }

  // podciąg (litery po kolei, niekoniecznie obok siebie)
  let ti = 0
  let hits = 0
  let streak = 0
  let score = 0
  for (const ch of q) {
    const found = t.indexOf(ch, ti)
    if (found === -1) return null
    streak = found === ti ? streak + 1 : 0
    score += 1 + streak
    ti = found + 1
    hits++
  }
  return hits === q.length ? score : null
}

export function fuzzyMatch(query: string, text: string): boolean {
  return fuzzyScore(query, text) !== null
}

/** Sortuje kandydatów malejąco po dopasowaniu; odrzuca niepasujących. */
export function fuzzyRank<T>(query: string, items: T[], key: (item: T) => string): T[] {
  return items
    .map((item) => ({ item, score: fuzzyScore(query, key(item)) }))
    .filter((r): r is { item: T; score: number } => r.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item)
}
