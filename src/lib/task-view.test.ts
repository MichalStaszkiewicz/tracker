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
})
