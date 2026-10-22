// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Notice } from './Notice'

afterEach(cleanup)

describe('Notice', () => {
  it('renderuje tytuł, treść, akcje i zamknięcie', () => {
    const open = vi.fn()
    const dismiss = vi.fn()
    render(
      <Notice
        icon="check-circle"
        title="Przywrócono"
        body="tracker.sqlite.pre-import.bak"
        actions={[{ key: 'open', label: 'Otwórz folder', onClick: open }]}
        onDismiss={dismiss}
        dismissLabel="Zamknij"
      />
    )
    expect(screen.getByRole('status').textContent).toContain('Przywrócono')
    expect(screen.getByText('tracker.sqlite.pre-import.bak').getAttribute('title')).toBe('tracker.sqlite.pre-import.bak')
    fireEvent.click(screen.getByRole('button', { name: 'Otwórz folder' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }))
    expect(open).toHaveBeenCalledTimes(1)
    expect(dismiss).toHaveBeenCalledTimes(1)
  })

  it('bez treści, akcji i zamknięcia — sam tytuł', () => {
    render(<Notice icon="check-circle" title="OK" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
