import { describe, expect, it } from 'vitest'
import type { TaskListItem } from '@shared/types'
import { autoScrollStep, canDrop, keyboardTarget, placementFromPointer, planDrop } from './list-dnd'
import type { TaskGroup } from './task-view'

function make(id: number): TaskListItem {
  return {
    id,
    title: `t${id}`,
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

const today = { key: 'date:today', patch: { plannedDate: '2026-09-23' } }
const tomorrow = { key: 'date:tomorrow', patch: { plannedDate: '2026-09-24' } }
const done = { key: 'date:done', locked: true }

describe('canDrop', () => {
  it('ta sama sekcja — zawsze (kolejność), także zablokowana', () => {
    expect(canDrop({ key: 'todo' }, { key: 'todo' })).toBe(true)
    expect(canDrop(done, done)).toBe(true)
  })
  it('inna sekcja bez patch (status/typ/zaległe) — nie', () => {
    expect(canDrop({ key: 'todo' }, { key: 'done' })).toBe(false)
    expect(canDrop(today, { key: 'date:overdue' })).toBe(false)
  })
  it('inna sekcja z patch (data/obszar) — tak', () => {
    expect(canDrop(today, tomorrow)).toBe(true)
    expect(canDrop({ key: 'area:1' }, { key: 'area:2', patch: { areaId: 2 } })).toBe(true)
  })
  it('regresja: z zablokowanej sekcji (Zrobione) nie da się wyciągnąć zadania do daty', () => {
    expect(canDrop(done, tomorrow)).toBe(false)
    expect(canDrop(done, { key: 'date:none', patch: { plannedDate: null } })).toBe(false)
  })
})

describe('planDrop', () => {
  it('ta sama sekcja + cel → tylko przesunięcie', () => {
    expect(planDrop(1, today, today, { id: 9, placement: 'before' })).toEqual({
      patch: undefined,
      target: { id: 9, placement: 'before' }
    })
  })
  it('inna sekcja + cel → patch sekcji i przesunięcie (jedna operacja)', () => {
    expect(planDrop(1, today, tomorrow, { id: 9, placement: 'after' })).toEqual({
      patch: { plannedDate: '2026-09-24' },
      target: { id: 9, placement: 'after' }
    })
  })
  it('pusta strefa innej sekcji → sam patch', () => {
    expect(planDrop(1, today, { key: 'date:none', patch: { plannedDate: null } })).toEqual({
      patch: { plannedDate: null },
      target: undefined
    })
  })
  it('null gdy nic się nie zmienia lub sekcja nie przyjmuje', () => {
    expect(planDrop(1, { key: 'x' }, { key: 'x' }, { id: 1, placement: 'before' })).toBeNull() // na siebie
    expect(planDrop(1, { key: 'x' }, { key: 'x' })).toBeNull() // pusta strefa własnej sekcji
    expect(planDrop(1, { key: 'todo' }, { key: 'done' }, { id: 9, placement: 'before' })).toBeNull()
    expect(planDrop(1, done, tomorrow, { id: 9, placement: 'before' })).toBeNull()
  })
})

describe('placementFromPointer', () => {
  it('górna połowa → przed, dolna → za', () => {
    expect(placementFromPointer(110, 100, 40)).toBe('before')
    expect(placementFromPointer(130, 100, 40)).toBe('after')
  })
})

describe('keyboardTarget', () => {
  const group: TaskGroup = { key: 'g', label: null, items: [make(1), make(2), make(3)] }
  it('Alt+↑ → przed poprzednim, Alt+↓ → za następnym', () => {
    expect(keyboardTarget(group, 2, -1)).toEqual({ id: 1, placement: 'before' })
    expect(keyboardTarget(group, 2, 1)).toEqual({ id: 3, placement: 'after' })
  })
  it('brzeg sekcji → null', () => {
    expect(keyboardTarget(group, 1, -1)).toBeNull()
    expect(keyboardTarget(group, 3, 1)).toBeNull()
  })
})

describe('autoScrollStep', () => {
  const box = { top: 100, bottom: 600, left: 200, right: 900 }
  it('środek listy → brak przewijania', () => {
    expect(autoScrollStep(box, 500, 350)).toBe(0)
  })
  it('przy górnej krawędzi → w górę, szybciej im bliżej', () => {
    const far = autoScrollStep(box, 500, 150)
    const near = autoScrollStep(box, 500, 110)
    expect(far).toBeLessThan(0)
    expect(near).toBeLessThan(far)
  })
  it('nad listą (za wysoko) → pełna prędkość w górę; pod listą → w dół', () => {
    expect(autoScrollStep(box, 500, 20)).toBe(-14)
    expect(autoScrollStep(box, 500, 700)).toBe(14)
  })
  it('poza listą w poziomie (sidebar) → 0', () => {
    expect(autoScrollStep(box, 100, 20)).toBe(0)
  })
})
