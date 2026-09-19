import { describe, it, expect } from 'vitest'
import { activeToken, applySuggestion } from './quick-add-parser'

describe('activeToken', () => {
  it('wykrywa pisany typ', () => {
    const input = 'babyheap /pw'
    expect(activeToken(input, input.length)).toEqual({ marker: '/', query: 'pw', start: 9 })
  })

  it('wykrywa pisany tag', () => {
    const input = 'x #he'
    expect(activeToken(input, input.length)).toEqual({ marker: '#', query: 'he', start: 2 })
  })

  it('rodzic może mieć spacje', () => {
    const input = 'x >Parser P'
    expect(activeToken(input, input.length)).toEqual({ marker: '>', query: 'Parser P', start: 2 })
  })

  it('po spacji token domknięty → null', () => {
    expect(activeToken('x /pwn ', 7)).toBeNull()
  })

  it('priorytet nie ma podpowiedzi', () => {
    expect(activeToken('x !1', 4)).toBeNull()
  })

  it('brak znacznika → null', () => {
    expect(activeToken('zwykły tytuł', 12)).toBeNull()
  })
})

describe('applySuggestion', () => {
  it('zastępuje pisany token wybraną wartością + spacja', () => {
    const input = 'babyheap /pw'
    const token = activeToken(input, input.length)!
    expect(applySuggestion(input, token, 'pwn')).toEqual({ text: 'babyheap /pwn ', caret: 14 })
  })

  it('wstawia wielowyrazowego rodzica', () => {
    const input = 'x >Parser P'
    const token = activeToken(input, input.length)!
    const out = applySuggestion(input, token, 'Parser PE w C++')
    expect(out.text).toBe('x >Parser PE w C++ ')
  })

  it('zachowuje tekst po kursorze', () => {
    const input = 'x /pw #heap'
    const token = activeToken(input, 5)! // kursor po "/pw"
    const out = applySuggestion(input, token, 'pwn')
    expect(out.text).toBe('x /pwn  #heap')
  })
})
