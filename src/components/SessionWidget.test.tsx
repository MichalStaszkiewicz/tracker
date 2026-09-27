// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import type { SessionActive, TaskListItem } from '@shared/types'

const task = (id: number, title: string): TaskListItem => ({
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
  completedAt: null,
  childProgress: null,
  counter: null,
  secondsSpent: 0,
  activeSession: null
})

vi.mock('@/api', () => ({
  api: {
    tasks: { list: vi.fn(async () => [task(3, 'Poczytać sieci'), task(4, 'Parser PE')]) },
    entries: { search: vi.fn(async () => []) }
  }
}))

const { SessionWidget } = await import('./SessionWidget')

afterEach(cleanup)

const running: SessionActive = {
  id: 1,
  entryId: 3,
  startedAt: new Date().toISOString(),
  entryTitle: 'Poczytać sieci',
  areaColor: null
}

function mount(props: Partial<Parameters<typeof SessionWidget>[0]> = {}) {
  const handlers = { onStop: vi.fn(), onPause: vi.fn(), onResume: vi.fn(), onSwitch: vi.fn() }
  const view = render(
    <I18nProvider>
      <SessionWidget active={running} paused={null} carried={0} {...handlers} {...props} />
    </I18nProvider>
  )
  return { ...view, ...handlers }
}

describe('SessionWidget', () => {
  it('bez sesji nic nie renderuje', () => {
    const { container } = mount({ active: null, paused: null })
    expect(container.querySelector('.session')).toBeNull()
  })

  it('trwająca sesja: tytuł zadania, pauza i stop działają', () => {
    const { onPause, onStop } = mount()
    expect(screen.getByText('Poczytać sieci')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Wstrzymaj' }))
    expect(onPause).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Stop'))
    expect(onStop).toHaveBeenCalled()
  })

  it('wstrzymana: etykieta „wstrzymana", przycisk Wznów, licznik stoi na zapamiętanym czasie', () => {
    const { onResume } = mount({
      active: null,
      paused: { entryId: 3, entryTitle: 'Poczytać sieci', areaColor: null },
      carried: 125
    })
    expect(screen.getByText(/wstrzymana/)).toBeTruthy()
    expect(screen.getByText('02:05')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Wznów' }))
    expect(onResume).toHaveBeenCalled()
  })

  it('sesja bez zadania pokazuje „bez zadania"', () => {
    mount({ active: { ...running, entryId: null, entryTitle: null } })
    expect(screen.getByText('bez zadania')).toBeTruthy()
  })

  it('regresja: ⇆ otwiera wybór zadania, a wybór przełącza sesję', async () => {
    const { onSwitch } = mount()
    const toggle = screen.getByRole('button', { name: 'Przełącz zadanie' })
    fireEvent.mouseDown(toggle)
    fireEvent.click(toggle)
    fireEvent.click(await screen.findByText('Parser PE'))
    expect(onSwitch).toHaveBeenCalledWith(4)
    await waitFor(() => expect(screen.queryByPlaceholderText('Przełącz na zadanie…')).toBeNull())
  })

  it('ponowny klik ⇆ zamyka wybór (nie otwiera go od nowa)', async () => {
    mount()
    const toggle = screen.getByRole('button', { name: 'Przełącz zadanie' })
    fireEvent.mouseDown(toggle)
    fireEvent.click(toggle)
    expect(await screen.findByPlaceholderText('Przełącz na zadanie…')).toBeTruthy()
    fireEvent.mouseDown(toggle)
    fireEvent.click(toggle)
    expect(screen.queryByPlaceholderText('Przełącz na zadanie…')).toBeNull()
  })
})
