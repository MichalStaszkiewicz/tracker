// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EntrySearchResult, TaskListItem } from '@shared/types'

const task = (id: number, title: string, done = false): TaskListItem => ({
  id,
  title,
  type: { key: 'task', name: 'Zadanie', icon: 'check-square', progressMode: 'none' },
  area: null,
  parent: null,
  stage: null,
  tags: [],
  priority: null,
  plannedDate: null,
  dueDate: null,
  completedAt: done ? '2026-09-27T09:00:00Z' : null,
  childProgress: null,
  counter: null,
  secondsSpent: 0,
  activeSession: null
})

const search = vi.fn(async (q: string): Promise<EntrySearchResult[]> => [
  { id: 21, title: `RFC ${q}`, icon: 'note', areaColor: null, subtitle: '' },
  { id: 22, title: `RFC ${q} 2`, icon: 'note', areaColor: null, subtitle: '' }
])
vi.mock('@/api', () => ({
  api: {
    tasks: { list: vi.fn(async () => [task(1, 'Aktywne A'), task(2, 'Zrobione', true), task(3, 'Aktywne B')]) },
    entries: { search: (q: string) => search(q) }
  }
}))

const { EntryPicker } = await import('./EntryPicker')

afterEach(cleanup)

const mount = () => {
  const onPick = vi.fn()
  const onClose = vi.fn()
  render(<EntryPicker onPick={onPick} onClose={onClose} label="Przełącz zadanie" placeholder="Szukaj" emptyText="Brak" />)
  return { onPick, onClose, input: screen.getByPlaceholderText('Szukaj') }
}

describe('EntryPicker', () => {
  it('bez frazy: niezrobione aktywne zadania', async () => {
    mount()
    expect(await screen.findByText('Aktywne A')).toBeTruthy()
    expect(screen.getByText('Aktywne B')).toBeTruthy()
    expect(screen.queryByText('Zrobione')).toBeNull()
  })

  it('fraza → wyszukiwanie; strzałka w dół + Enter wybiera drugi wynik', async () => {
    const { input, onPick } = mount()
    fireEvent.change(input, { target: { value: 'tcp' } })
    await screen.findByText('RFC tcp 2')
    expect(search).toHaveBeenCalledWith('tcp')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onPick).toHaveBeenCalledWith(22)
  })

  it('semantyka combobox: aktywna opcja wskazana przez aria-activedescendant', async () => {
    const { input } = mount()
    await screen.findByText('Aktywne A')
    expect(screen.getByRole('dialog', { name: 'Przełącz zadanie' })).toBeTruthy()
    expect(input.getAttribute('role')).toBe('combobox')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const activeId = input.getAttribute('aria-activedescendant')
    expect(activeId && document.getElementById(activeId)?.textContent).toContain('Aktywne B')
  })

  it('Esc i klik obok zamykają', async () => {
    const { input, onClose } = mount()
    fireEvent.keyDown(input, { key: 'Escape' })
    fireEvent.mouseDown(document.body)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2))
  })
})
