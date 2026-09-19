// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useHotkeys } from './useHotkeys'

function Harness({ fn }: { fn: () => void }) {
  useHotkeys({ 'ctrl+k': fn })
  return null
}

describe('useHotkeys', () => {
  it('odpala handler na ctrl+k', () => {
    const fn = vi.fn()
    render(<Harness fn={fn} />)
    window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k', bubbles: true }))
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('nie odpala na samo k', () => {
    const fn = vi.fn()
    render(<Harness fn={fn} />)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }))
    expect(fn).not.toHaveBeenCalled()
  })
})
