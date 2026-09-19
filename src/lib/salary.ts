/** Wyciąga porównywalną wartość liczbową z tekstu widełek ("20–26k" → 26000). Czysta. */
export function salaryValue(s: string): number {
  if (!s) return 0
  const hasK = /k|tys/i.test(s)
  const nums = (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(',', '.')))
  if (nums.length === 0) return 0
  const max = Math.max(...nums)
  return hasK && max < 1000 ? max * 1000 : max
}
