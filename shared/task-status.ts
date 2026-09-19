import type { TaskListItem, TaskStatus } from './types'

/**
 * Status wpisu na liście zadań wynika z danych, nie z osobnej kolumny:
 * - done: etap końcowy (stage.isDone) lub completedAt ustawione,
 * - in_progress: trwa sesja albo już był ruszony (etap inny niż pierwszy),
 * - todo: reszta.
 * `firstStageId` to id pierwszego etapu danego typu (jeśli znane) — pozwala
 * odróżnić „ruszone" od „świeżego".
 */
export function taskStatus(item: TaskListItem, firstStageId?: number): TaskStatus {
  if (item.stage?.isDone || item.completedAt) return 'done'
  if (item.activeSession) return 'in_progress'
  if (item.secondsSpent > 0) return 'in_progress'
  if (item.stage && firstStageId !== undefined && item.stage.id !== firstStageId) {
    return 'in_progress'
  }
  return 'todo'
}

export function isDoneToday(item: TaskListItem, now: Date = new Date()): boolean {
  if (!item.completedAt) return false
  const done = new Date(item.completedAt)
  return (
    done.getFullYear() === now.getFullYear() &&
    done.getMonth() === now.getMonth() &&
    done.getDate() === now.getDate()
  )
}
