/**
 * Czysta logika przeciągania zadań na liście: czy sekcja przyjmie zadanie i co zapisać po
 * upuszczeniu. Bez React i bez api — wykonanie planu należy do hooka useTaskReorder.
 */

import type { MovePatch, MovePlacement } from '@shared/types'
import type { TaskGroup } from './task-view'

/** Typ MIME przeciąganej karty zadania — wspólny dla listy i sidebara (odrzuca obcy tekst). */
export const TASK_DND_TYPE = 'application/x-task-id'

export interface DropTarget {
  id: number
  placement: MovePlacement
}

/** Co wykonać: `patch` (wartość sekcji docelowej) i/lub przesunięcie względem `target`. */
export interface DropPlan {
  patch?: MovePatch
  target?: DropTarget
}

type GroupRef = Pick<TaskGroup, 'key' | 'patch'>

/** W obrębie tej samej sekcji — zawsze (kolejność). Do innej — tylko gdy sekcja ma `patch`. */
export function canDrop(fromGroupKey: string, to: GroupRef): boolean {
  return to.key === fromGroupKey || to.patch !== undefined
}

/** Plan upuszczenia albo null, gdy nic by się nie zmieniło lub sekcja nie przyjmuje zadania. */
export function planDrop(taskId: number, fromGroupKey: string, to: GroupRef, target?: DropTarget): DropPlan | null {
  if (!canDrop(fromGroupKey, to)) return null
  const patch = to.key !== fromGroupKey ? to.patch : undefined
  const move = target && target.id !== taskId ? target : undefined
  if (!patch && !move) return null
  return { patch, target: move }
}

/** Górna połowa karty → przed, dolna → za. */
export function placementFromPointer(clientY: number, top: number, height: number): MovePlacement {
  return clientY < top + height / 2 ? 'before' : 'after'
}

/** Sąsiad do przeniesienia klawiaturą (Alt+↑/↓) w obrębie sekcji; null = brzeg sekcji. */
export function keyboardTarget(group: TaskGroup, taskId: number, dir: -1 | 1): DropTarget | null {
  const i = group.items.findIndex((it) => it.id === taskId)
  const neighbor = i < 0 ? undefined : group.items[i + dir]
  if (!neighbor) return null
  return { id: neighbor.id, placement: dir < 0 ? 'before' : 'after' }
}
