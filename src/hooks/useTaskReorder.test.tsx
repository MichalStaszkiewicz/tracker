// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import type { TaskGroup } from '@/lib/task-view'
import type { TaskListItem } from '@shared/types'

// jsdom nie ma DragEvent — polyfill na bazie MouseEvent, żeby clientY trafiało do zdarzenia.
if (!('DragEvent' in window)) {
  Object.defineProperty(window, 'DragEvent', { value: class extends MouseEvent {} })
}

const move = vi.fn(async () => undefined)
const update = vi.fn(async () => undefined)
vi.mock('@/api', () => ({
  api: {
    entries: {
      move: (...a: unknown[]) => move(...(a as [])),
      update: (...a: unknown[]) => update(...(a as []))
    }
  }
}))

const { useTaskReorder } = await import('./useTaskReorder')
const { TaskCard } = await import('@/components/TaskCard')
const { TaskSection } = await import('@/components/TaskSection')

function make(id: number): TaskListItem {
  return {
    id,
    title: `Zadanie ${id}`,
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
  }
}

function Harness({ groups, onMoved }: { groups: TaskGroup[]; onMoved: () => void }) {
  const r = useTaskReorder({ groups, onMoved })
  return (
    <div className="list" {...r.listProps}>
      {groups.map((g) => (
        <TaskSection key={g.key} label={g.key} count={g.items.length} drop={r.bindSection(g)} emptyHint={`upuść:${g.key}`}>
          {g.items.map((it) => (
            <TaskCard key={it.id} item={it} onToggle={() => {}} reorder={r.bindCard(it, g)} />
          ))}
        </TaskSection>
      ))}
    </div>
  )
}

const mount = (groups: TaskGroup[], onMoved = vi.fn()) =>
  render(
    <I18nProvider>
      <Harness groups={groups} onMoved={onMoved} />
    </I18nProvider>
  )

const card = (id: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-task-id="${id}"]`)
  if (!el) throw new Error(`brak karty ${id}`)
  el.getBoundingClientRect = () => ({ top: 100, height: 40, bottom: 140, left: 0, right: 300, width: 300, x: 0, y: 100, toJSON: () => ({}) })
  return el
}

/** Minimalny DataTransfer współdzielony przez całe przeciąganie. */
function makeDataTransfer() {
  const data: Record<string, string> = {}
  return {
    setData: (k: string, v: string) => {
      data[k] = v
    },
    getData: (k: string) => data[k] ?? '',
    get types() {
      return Object.keys(data)
    },
    effectAllowed: '',
    dropEffect: ''
  }
}

beforeEach(() => {
  move.mockClear()
  update.mockClear()
})
// Bez `globals` RTL nie sprząta sam — inaczej querySelector trafia w karty z poprzedniego testu.
afterEach(cleanup)

describe('useTaskReorder', () => {
  it('przeciągnięcie w obrębie sekcji → move(id, cel, za)', async () => {
    const onMoved = vi.fn()
    mount([{ key: 'todo', label: null, items: [make(1), make(2), make(3)] }], onMoved)
    const dt = makeDataTransfer()
    fireEvent.dragStart(card(1), { dataTransfer: dt })
    fireEvent.dragOver(card(3), { dataTransfer: dt, clientY: 135 }) // dolna połowa
    expect(card(3).className).toContain('card--drop-after')
    fireEvent.drop(card(3), { dataTransfer: dt, clientY: 135 })
    await waitFor(() => expect(move).toHaveBeenCalledWith(1, 3, 'after', undefined))
    expect(onMoved).toHaveBeenCalled()
  })

  it('górna połowa karty → przed', async () => {
    mount([{ key: 'todo', label: null, items: [make(1), make(2)] }])
    const dt = makeDataTransfer()
    fireEvent.dragStart(card(2), { dataTransfer: dt })
    fireEvent.dragOver(card(1), { dataTransfer: dt, clientY: 105 })
    fireEvent.drop(card(1), { dataTransfer: dt, clientY: 105 })
    await waitFor(() => expect(move).toHaveBeenCalledWith(2, 1, 'before', undefined))
  })

  it('upuszczenie w pustej sekcji „Jutro" → ustawia datę sekcji', async () => {
    const { getByText } = mount([
      { key: 'date:today', label: null, patch: { plannedDate: '2026-09-23' }, items: [make(1)] },
      { key: 'date:tomorrow', label: null, patch: { plannedDate: '2026-09-24' }, items: [] }
    ])
    const dt = makeDataTransfer()
    fireEvent.dragStart(card(1), { dataTransfer: dt })
    const zone = getByText('upuść:date:tomorrow')
    fireEvent.dragOver(zone, { dataTransfer: dt })
    fireEvent.drop(zone, { dataTransfer: dt })
    await waitFor(() => expect(update).toHaveBeenCalledWith(1, { plannedDate: '2026-09-24' }))
    expect(move).not.toHaveBeenCalled()
  })

  it('upuszczenie na kartę w innej sekcji z datą → jedno move z patchem', async () => {
    mount([
      { key: 'date:today', label: null, patch: { plannedDate: '2026-09-23' }, items: [make(1)] },
      { key: 'date:tomorrow', label: null, patch: { plannedDate: '2026-09-24' }, items: [make(2)] }
    ])
    const dt = makeDataTransfer()
    fireEvent.dragStart(card(1), { dataTransfer: dt })
    fireEvent.dragOver(card(2), { dataTransfer: dt, clientY: 105 })
    fireEvent.drop(card(2), { dataTransfer: dt, clientY: 105 })
    await waitFor(() => expect(move).toHaveBeenCalledWith(1, 2, 'before', { plannedDate: '2026-09-24' }))
  })

  it('sekcja bez patch (status) odrzuca zadanie z innej sekcji i jest przygaszona', async () => {
    const { container } = mount([
      { key: 'todo', label: null, items: [make(1)] },
      { key: 'done', label: null, items: [make(2)] }
    ])
    const dt = makeDataTransfer()
    fireEvent.dragStart(card(1), { dataTransfer: dt })
    expect(container.querySelectorAll('.tsection--refuse')).toHaveLength(1)
    fireEvent.dragOver(card(2), { dataTransfer: dt, clientY: 105 })
    expect(card(2).className).not.toContain('card--drop-')
    fireEvent.drop(card(2), { dataTransfer: dt, clientY: 105 })
    await new Promise((r) => setTimeout(r, 0))
    expect(move).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('ignoruje przeciągnięcia, które nie zaczęły się na liście', async () => {
    mount([{ key: 'todo', label: null, items: [make(1), make(2)] }])
    const dt = makeDataTransfer()
    dt.setData('text/plain', '42')
    fireEvent.dragOver(card(1), { dataTransfer: dt, clientY: 105 })
    fireEvent.drop(card(1), { dataTransfer: dt, clientY: 105 })
    await new Promise((r) => setTimeout(r, 0))
    expect(move).not.toHaveBeenCalled()
  })

  it('Alt+↑ na karcie przesuwa ją przed poprzednią', async () => {
    mount([{ key: 'todo', label: null, items: [make(1), make(2), make(3)] }])
    fireEvent.keyDown(card(2), { key: 'ArrowUp', altKey: true })
    await waitFor(() => expect(move).toHaveBeenCalledWith(2, 1, 'before', undefined))
  })

  it('Alt+↑ na pierwszej karcie sekcji nic nie robi', async () => {
    mount([{ key: 'todo', label: null, items: [make(1), make(2)] }])
    fireEvent.keyDown(card(1), { key: 'ArrowUp', altKey: true })
    await new Promise((r) => setTimeout(r, 0))
    expect(move).not.toHaveBeenCalled()
  })
})
