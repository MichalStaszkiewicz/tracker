import { describe, it, expect } from 'vitest'
import type { Area, Tag, TaskListItem } from '@shared/types'
import { filterTasks, groupTasks } from './task-view'

const area = (id: number, name: string): Area => ({ id, name, color: '#000', position: id })
const tag = (id: number, name: string): Tag => ({ id, groupName: 'tech', name, color: null })

function make(over: Partial<TaskListItem> & { id: number; title: string }): TaskListItem {
  return {
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
    activeSession: null,
    ...over
  }
}

describe('filterTasks', () => {
  const tasks = [
    make({ id: 1, title: 'Alpha', type: { key: 'pwn', name: 'Pwn', icon: 'x', progressMode: 'none' }, tags: [tag(7, 'heap')] }),
    make({ id: 2, title: 'Beta', tags: [tag(8, 'winapi')] }),
    make({ id: 3, title: 'Gamma' })
  ]

  it('filtruje po typie', () => {
    expect(filterTasks(tasks, { typeKey: 'pwn' }).map((t) => t.id)).toEqual([1])
  })
  it('filtruje po tagu', () => {
    expect(filterTasks(tasks, { tagId: 8 }).map((t) => t.id)).toEqual([2])
  })
  it('filtruje po obszarze', () => {
    const withArea = [
      make({ id: 10, title: 'A', area: area(1, 'Alpha') }),
      make({ id: 11, title: 'B', area: area(2, 'Beta') })
    ]
    expect(filterTasks(withArea, { areaId: 2 }).map((t) => t.id)).toEqual([11])
  })
  it('filtruje po tekście (bez rozróżniania wielkości)', () => {
    expect(filterTasks(tasks, { query: 'gam' }).map((t) => t.id)).toEqual([3])
  })
  it('łączy kryteria', () => {
    expect(filterTasks(tasks, { typeKey: 'task', query: 'be' }).map((t) => t.id)).toEqual([2])
  })
})

describe('groupTasks', () => {
  const tasks = [
    make({ id: 1, title: 'active', secondsSpent: 60 }),
    make({ id: 2, title: 'todo' }),
    make({ id: 3, title: 'done', completedAt: '2026-09-18T10:00:00.000Z' }),
    make({ id: 4, title: 'area A', area: area(1, 'Alpha') }),
    make({ id: 5, title: 'area B', area: area(2, 'Beta') })
  ]

  it('grupuje po statusie w kolejności in_progress → todo → done', () => {
    const groups = groupTasks(tasks, 'status')
    expect(groups.map((g) => g.key)).toEqual(['in_progress', 'todo', 'done'])
  })

  it('grupuje po obszarze z etykietą', () => {
    const groups = groupTasks(tasks.slice(3), 'area')
    expect(groups.map((g) => g.label)).toEqual(['Alpha', 'Beta'])
  })

  it('grupuje po typie', () => {
    const groups = groupTasks(tasks, 'type')
    expect(groups[0].items.length).toBe(5)
    expect(groups[0].label).toBe('Zadanie')
  })

  it('status i typ nie przyjmują zadań z innych sekcji (brak patch)', () => {
    expect(groupTasks(tasks, 'status').every((g) => g.patch === undefined)).toBe(true)
    expect(groupTasks(tasks, 'type').every((g) => g.patch === undefined)).toBe(true)
  })

  it('obszary kluczowane po id, patch = id obszaru (brak obszaru → null)', () => {
    const byArea = groupTasks([...tasks.slice(3), make({ id: 6, title: 'bez' })], 'area')
    expect(byArea.map((g) => g.label)).toEqual(['—', 'Alpha', 'Beta'])
    expect(byArea.find((g) => g.label === 'Beta')).toMatchObject({ key: 'area:2', patch: { areaId: 2 } })
    expect(byArea.find((g) => g.label === '—')).toMatchObject({ key: 'area:none', patch: { areaId: null } })
  })

  it('dwa obszary o tej samej nazwie to dwie sekcje', () => {
    const twins = groupTasks([make({ id: 7, title: 'a', area: area(1, 'X') }), make({ id: 8, title: 'b', area: area(9, 'X') })], 'area')
    expect(twins).toHaveLength(2)
  })

  it('zachowuje kolejność wejścia wewnątrz sekcji', () => {
    const g = groupTasks([make({ id: 3, title: 'c' }), make({ id: 1, title: 'a' }), make({ id: 2, title: 'b' })], 'type')
    expect(g[0].items.map((i) => i.id)).toEqual([3, 1, 2])
  })
})

describe('groupTasks — data', () => {
  const NOW = new Date(2026, 8, 23, 10, 0, 0) // śr 2026-09-23
  const list = [
    make({ id: 1, title: 'bez daty' }),
    make({ id: 2, title: 'jutro', plannedDate: '2026-09-24' }),
    make({ id: 3, title: 'zaległe', plannedDate: '2026-09-20' }),
    make({ id: 4, title: 'dziś', plannedDate: '2026-09-23' }),
    make({ id: 5, title: 'piątek', plannedDate: '2026-09-25' }),
    make({ id: 6, title: 'zrobione dawno', plannedDate: '2026-09-01', completedAt: '2026-09-01T10:00:00Z' }),
    make({ id: 7, title: 'poniedziałek', plannedDate: '2026-09-28' }),
    make({ id: 8, title: 'zrobione dziś', plannedDate: '2026-09-23', completedAt: '2026-09-23T09:00:00Z' })
  ]

  it('sekcje: zaległe → dziś → jutro → kolejne dni → bez daty → zrobione', () => {
    const g = groupTasks(list, 'date', { now: NOW })
    expect(g.map((x) => x.key)).toEqual([
      'date:overdue',
      'date:today',
      'date:tomorrow',
      'date:2026-09-25',
      'date:2026-09-28',
      'date:none',
      'date:done'
    ])
  })

  it('zrobione zawsze w sekcji „zrobione", niezależnie od daty (nigdy jako zaległe)', () => {
    const g = groupTasks(list, 'date', { now: NOW })
    expect(g.find((x) => x.key === 'date:done')?.items.map((i) => i.id)).toEqual([6, 8])
    expect(g.find((x) => x.key === 'date:overdue')?.items.map((i) => i.id)).toEqual([3])
  })

  it('patch = data sekcji; zaległe i zrobione nie przyjmują zadań z innych sekcji', () => {
    const g = groupTasks(list, 'date', { now: NOW })
    const by = (k: string) => g.find((x) => x.key === k)?.patch
    expect(by('date:today')).toEqual({ plannedDate: '2026-09-23' })
    expect(by('date:tomorrow')).toEqual({ plannedDate: '2026-09-24' })
    expect(by('date:2026-09-25')).toEqual({ plannedDate: '2026-09-25' })
    expect(by('date:none')).toEqual({ plannedDate: null })
    expect(by('date:overdue')).toBeUndefined()
    expect(by('date:done')).toBeUndefined()
  })

  it('ensureDateBuckets: puste Dziś/Jutro/Bez daty jako strefy upuszczania', () => {
    const g = groupTasks([make({ id: 9, title: 'x', plannedDate: '2026-09-25' })], 'date', { now: NOW, ensureDateBuckets: true })
    expect(g.map((x) => x.key)).toEqual(['date:today', 'date:tomorrow', 'date:2026-09-25', 'date:none'])
    expect(g.find((x) => x.key === 'date:today')?.items).toHaveLength(0)
  })
})
