import { describe, it, expect } from 'vitest'
import { salaryValue } from './salary'

describe('salaryValue', () => {
  it.each([
    ['20–26k', 26000],
    ['18–23k', 23000],
    ['9k', 9000],
    ['12000', 12000],
    ['', 0],
    ['do uzgodnienia', 0]
  ])('%s → %i', (input, expected) => {
    expect(salaryValue(input)).toBe(expected)
  })

  it('sortuje magnitudą, nie leksykalnie (9k < 18–23k)', () => {
    expect(salaryValue('9k')).toBeLessThan(salaryValue('18–23k'))
  })
})
