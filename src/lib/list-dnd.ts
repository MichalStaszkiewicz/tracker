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

export type GroupRef = Pick<TaskGroup, 'key' | 'patch' | 'locked'>

/**
 * W obrębie tej samej sekcji — zawsze (kolejność). Do innej — tylko gdy docelowa ma `patch`,
 * a źródłowa nie jest zablokowana (np. „Zrobione": nowa data i tak nie przeniosłaby zadania).
 */
export function canDrop(from: GroupRef, to: GroupRef): boolean {
  if (to.key === from.key) return true
  return to.patch !== undefined && !from.locked
}

/** Plan upuszczenia albo null, gdy nic by się nie zmieniło lub sekcja nie przyjmuje zadania. */
export function planDrop(taskId: number, from: GroupRef, to: GroupRef, target?: DropTarget): DropPlan | null {
  if (!canDrop(from, to)) return null
  const patch = to.key !== from.key ? to.patch : undefined
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

export interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * Auto-przewijanie listy podczas przeciągania: px na klatkę (ujemne = w górę). Im bliżej
 * krawędzi, tym szybciej; nad listą / pod nią — pełna prędkość. Poza listą w poziomie
 * (np. nad sidebarem z obszarami) — 0, żeby nie przeszkadzać w upuszczaniu na obszar.
 */
export function autoScrollStep(box: Box, x: number, y: number, edge = 64, max = 14): number {
  if (x < box.left || x > box.right) return 0
  const up = box.top + edge - y
  if (up > 0) return -Math.ceil(max * Math.min(1, up / edge))
  const down = y - (box.bottom - edge)
  if (down > 0) return Math.ceil(max * Math.min(1, down / edge))
  return 0
}
