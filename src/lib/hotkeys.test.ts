import { describe, it, expect } from 'vitest'
import { comboFromEvent, type KeyLike } from './hotkeys'

const ev = (over: Partial<KeyLike>): KeyLike => ({
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  key: '',
  ...over
})

describe('comboFromEvent', () => {
  it('ctrl+litera', () => {
    expect(comboFromEvent(ev({ ctrlKey: true, key: 'T' }))).toBe('ctrl+t')
  })
  it('cmd traktowane jak ctrl', () => {
    expect(comboFromEvent(ev({ metaKey: true, key: 'k' }))).toBe('ctrl+k')
  })
  it('spacja normalizowana', () => {
    expect(comboFromEvent(ev({ ctrlKey: true, shiftKey: true, key: ' ' }))).toBe('ctrl+shift+space')
  })
  it('cyfra', () => {
    expect(comboFromEvent(ev({ ctrlKey: true, key: '1' }))).toBe('ctrl+1')
  })
})
