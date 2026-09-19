import { describe, it, expect } from 'vitest'
import { computeProgress } from './progress'

describe('computeProgress', () => {
  it('children: procent zamkniętych podzadań', () => {
    expect(computeProgress({ mode: 'children', childrenDone: 2, childrenTotal: 4 })).toEqual({
      ratio: 0.5,
      label: '2/4'
    })
  })

  it('children bez podzadań → brak postępu', () => {
    expect(computeProgress({ mode: 'children', childrenDone: 0, childrenTotal: 0 })).toEqual({
      ratio: null,
      label: null
    })
  })

  it('counter: obecnie/łącznie', () => {
    expect(computeProgress({ mode: 'counter', counterCurrent: 14, counterTotal: 28 })).toEqual({
      ratio: 0.5,
      label: '14/28'
    })
  })

  it('none → brak postępu', () => {
    expect(computeProgress({ mode: 'none' })).toEqual({ ratio: null, label: null })
  })

  it('przycina ratio do 0..1', () => {
    expect(computeProgress({ mode: 'counter', counterCurrent: 30, counterTotal: 28 }).ratio).toBe(1)
  })
})
