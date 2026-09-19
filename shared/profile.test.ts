import { describe, it, expect } from 'vitest'
import { initialsFrom } from './profile'

describe('initialsFrom', () => {
  it.each([
    ['Marek K.', 'MK'],
    ['Ada Lovelace', 'AL'],
    ['jednoimie', 'J'],
    ['   ', ''],
    ['a b c d', 'AB']
  ])('%s → %s', (name, expected) => {
    expect(initialsFrom(name)).toBe(expected)
  })
})
