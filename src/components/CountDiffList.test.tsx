// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CountDiffList } from './CountDiffList'

afterEach(cleanup)

describe('CountDiffList', () => {
  it('nagłówki i wiersze teraz → po zmianie; zmienione wiersze mają klasę --changed', () => {
    render(
      <CountDiffList
        headers={{ label: 'dane', current: 'teraz', incoming: 'w kopii' }}
        rows={[
          { key: 'entries', label: 'wpisy', mono: false, current: 16, incoming: 12 },
          { key: 'tags', label: 'tagi', mono: false, current: 2, incoming: 2 },
          { key: 'x_new', label: 'x_new', mono: true, current: 0, incoming: 3 }
        ]}
      />
    )
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['dane', 'teraz', 'w kopii'])
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((r) => Array.from(r.children).map((c) => c.textContent))).toEqual([
      ['wpisy', '16', '12'],
      ['tagi', '2', '2'],
      ['x_new', '0', '3']
    ])
    expect(rows.map((r) => r.classList.contains('countdiff__row--changed'))).toEqual([true, false, true])
    expect(screen.getByText('x_new').classList.contains('countdiff__label--mono')).toBe(true)
  })
})
