import { describe, it, expect } from 'vitest'
import { fuzzyMatch, fuzzyRank, fuzzyScore } from './fuzzy'

describe('fuzzyScore', () => {
  it('trafia podciąg', () => {
    expect(fuzzyMatch('hep', 'heap exploitation')).toBe(true)
    expect(fuzzyMatch('xyz', 'heap')).toBe(false)
  })

  it('prefiks punktowany wyżej niż środek', () => {
    const prefix = fuzzyScore('he', 'heap')!
    const middle = fuzzyScore('ap', 'heap')!
    expect(prefix).toBeGreaterThan(middle)
  })

  it('pusty query pasuje', () => {
    expect(fuzzyScore('', 'cokolwiek')).not.toBeNull()
  })
})

describe('fuzzyRank', () => {
  it('sortuje po dopasowaniu i odrzuca niepasujące', () => {
    const out = fuzzyRank('p', ['pwn', 'project', 'note'], (x) => x)
    expect(out).toEqual(['pwn', 'project'])
  })
})
