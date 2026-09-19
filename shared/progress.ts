import type { ProgressMode } from './types'

export interface ProgressInput {
  mode: ProgressMode
  childrenDone?: number
  childrenTotal?: number
  counterCurrent?: number
  counterTotal?: number
}

export interface ProgressResult {
  /** 0..1 lub null gdy brak sensownego postępu */
  ratio: number | null
  label: string | null
}

/** Czysta funkcja: jeden komponent postępu dla trzech trybów. */
export function computeProgress(input: ProgressInput): ProgressResult {
  switch (input.mode) {
    case 'children': {
      const total = input.childrenTotal ?? 0
      const done = input.childrenDone ?? 0
      if (total <= 0) return { ratio: null, label: null }
      return { ratio: clamp(done / total), label: `${done}/${total}` }
    }
    case 'counter': {
      const total = input.counterTotal ?? 0
      const current = input.counterCurrent ?? 0
      if (total <= 0) return { ratio: null, label: null }
      return { ratio: clamp(current / total), label: `${current}/${total}` }
    }
    case 'none':
    default:
      return { ratio: null, label: null }
  }
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}
