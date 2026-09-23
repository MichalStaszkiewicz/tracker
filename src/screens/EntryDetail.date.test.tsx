// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { addDaysKey, toDateKey } from '@shared/dates'
import type { EntryDetail as ED } from '@shared/types'

const detail: ED = {
  id: 7,
  type: {
    id: 1,
    key: 'task',
    name: 'Zadanie',
    icon: 'check-square',
    fields: [],
    progressMode: 'children',
    autoRetro: false,
    showOnBoard: true,
    template: [],
    position: 0
  },
  title: 'Process Explorer w c++',
  descriptionMd: '',
  data: {},
  area: null,
  stage: null,
  stages: [],
  tags: [],
  links: [],
  priority: null,
  plannedDate: null,
  dueDate: null,
  secondsSpent: 0,
  children: []
}

const update = vi.fn(async () => detail)
vi.mock('@/api', () => ({
  api: {
    entries: {
      detail: vi.fn(async () => detail),
      update: (...a: unknown[]) => update(...(a as []))
    },
    types: { list: vi.fn(async () => []) },
    areas: { list: vi.fn(async () => []) },
    sessions: { start: vi.fn(async () => undefined) },
    system: { openExternal: vi.fn(), openPath: vi.fn() }
  }
}))

const { EntryDetail } = await import('./EntryDetail')

afterEach(cleanup)

describe('EntryDetail — data zadania', () => {
  it('wybór „Jutro" w nagłówku zapisuje plannedDate przez api.entries.update', async () => {
    render(
      <I18nProvider>
        <EntryDetail id={7} onClose={() => {}} onOpen={() => {}} />
      </I18nProvider>
    )
    await screen.findByDisplayValue('Process Explorer w c++')
    fireEvent.click(screen.getByRole('button', { name: 'Data zadania' }))
    fireEvent.click(screen.getByText('Jutro'))
    const tomorrow = addDaysKey(toDateKey(new Date()), 1)
    await waitFor(() => expect(update).toHaveBeenCalledWith(7, { plannedDate: tomorrow }))
  })
})
