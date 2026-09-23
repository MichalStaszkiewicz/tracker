// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToday } from './useToday'

function Harness() {
  return <span data-testid="today">{useToday()}</span>
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useToday', () => {
  it('przełącza się na nowy dzień po północy (regresja: „Dziś" zapisywało wczorajszą datę)', () => {
    vi.setSystemTime(new Date(2026, 8, 23, 23, 59, 0))
    render(<Harness />)
    expect(screen.getByTestId('today').textContent).toBe('2026-09-23')
    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000)
    })
    expect(screen.getByTestId('today').textContent).toBe('2026-09-24')
  })

  it('synchronizuje się po powrocie do okna (np. po uśpieniu komputera)', () => {
    vi.setSystemTime(new Date(2026, 8, 23, 12, 0, 0))
    render(<Harness />)
    vi.setSystemTime(new Date(2026, 8, 25, 9, 0, 0)) // zegar przeskoczył, timer nie zdążył
    act(() => {
      fireEvent(window, new Event('focus'))
    })
    expect(screen.getByTestId('today').textContent).toBe('2026-09-25')
  })
})
