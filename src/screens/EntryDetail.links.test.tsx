// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { SessionProvider } from '@/session-context'
import type { EntryDetail as ED } from '@shared/types'

const baseDetail: ED = {
  id: 1,
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
  links: [{ id: 10, entryId: 1, kind: 'url', label: 'RFC', target: 'https://example.com/a' }],
  priority: null,
  plannedDate: null,
  dueDate: null,
  secondsSpent: 0,
  children: []
}

const addLink = vi.fn(async () => ({ id: 11, entryId: 1, kind: 'url', label: 'x', target: 'https://x' }))
const detail = vi.fn(async () => baseDetail)

const start = vi.fn(async (entryId: number | null) => ({ id: 1, entryId, startedAt: new Date().toISOString(), groupId: 1, carriedSeconds: 0, entryTitle: 'x', areaColor: null }))
const switchFn = vi.fn(async (entryId: number, _paused?: number) => ({ id: 2, entryId, startedAt: new Date().toISOString(), groupId: 2, carriedSeconds: 0, entryTitle: 'x', areaColor: null }))
vi.mock('@/api', () => ({
  api: {
    entries: {
      detail: (...a: unknown[]) => detail(...(a as [])),
      addLink: (...a: unknown[]) => addLink(...(a as [])),
      removeLink: vi.fn(async () => undefined),
      update: vi.fn(async () => baseDetail),
      setType: vi.fn(async () => baseDetail),
      setStage: vi.fn(async () => undefined),
      addTag: vi.fn(async () => undefined),
      removeTag: vi.fn(async () => undefined),
      updateLink: vi.fn(async () => undefined)
    },
    types: { list: vi.fn(async () => []) },
    areas: { list: vi.fn(async () => []) },
    sessions: { active: vi.fn(async () => null), start: (entryId: number | null) => start(entryId), switch: (entryId: number, paused?: number) => switchFn(entryId, paused), stop: vi.fn(async () => undefined) },
    system: { openExternal: vi.fn(), openPath: vi.fn() }
  }
}))

const { EntryDetail } = await import('./EntryDetail')

const renderDetail = () =>
  render(
    <I18nProvider>
      <SessionProvider>
        <EntryDetail id={1} onClose={() => {}} onOpen={() => {}} />
      </SessionProvider>
    </I18nProvider>
  )

describe('EntryDetail — zakładka Linki', () => {
  beforeEach(() => {
    addLink.mockClear()
  })

  it('renderuje istniejące linki i dodaje nowy bez crasha', async () => {
    renderDetail()
    await screen.findByDisplayValue('Process Explorer w c++')
    fireEvent.click(screen.getByRole('button', { name: /Linki/ }))
    // istniejący link musi się wyrenderować
    expect(screen.getByText('RFC')).toBeTruthy()
    const target = screen.getByPlaceholderText('URL lub ścieżka')
    fireEvent.change(target, { target: { value: 'https://example.com/new' } })
    fireEvent.keyDown(target, { key: 'Enter' })
    await waitFor(() => expect(addLink).toHaveBeenCalledTimes(1))
  })
})
