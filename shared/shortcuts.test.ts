import { describe, it, expect } from 'vitest'
import { DEFAULT_SHORTCUTS, formatCombo, resolveShortcuts } from './shortcuts'

describe('resolveShortcuts', () => {
  it('puste → domyślne', () => {
    expect(resolveShortcuts({})).toEqual(DEFAULT_SHORTCUTS)
  })
  it('nadpisuje znaną akcję', () => {
    expect(resolveShortcuts({ session: 'ctrl+shift+s' }).session).toBe('ctrl+shift+s')
  })
  it('ignoruje nieznaną akcję', () => {
    const out = resolveShortcuts({ 'nie.ma': 'ctrl+x' })
    expect(out).toEqual(DEFAULT_SHORTCUTS)
  })
})

describe('formatCombo', () => {
  it.each([
    ['ctrl+shift+space', 'Ctrl ⇧ Space'],
    ['ctrl+t', 'Ctrl T'],
    ['ctrl+arrowup', 'Ctrl ↑'],
    ['ctrl+1', 'Ctrl 1']
  ])('%s → %s', (combo, expected) => {
    expect(formatCombo(combo)).toBe(expected)
  })
})
