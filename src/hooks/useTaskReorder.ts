import { useRef, useState, type DragEvent } from 'react'
import { api } from '@/api'
import {
  TASK_DND_TYPE,
  canDrop,
  keyboardTarget,
  placementFromPointer,
  planDrop,
  type DropPlan,
  type DropTarget
} from '@/lib/list-dnd'
import type { TaskGroup } from '@/lib/task-view'
import type { MovePlacement, TaskListItem } from '@shared/types'

/** Wiązania karty zadania z przeciąganiem na liście (TaskCard pozostaje głupi). */
export interface CardReorder {
  indicator: MovePlacement | null
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (e: DragEvent<HTMLElement>) => void
  onDrop: (e: DragEvent<HTMLElement>) => void
  onMoveKey: (dir: -1 | 1) => void
}

export type SectionDropState = 'idle' | 'accept' | 'refuse' | 'over'

/** Wiązania sekcji: odstępy między kartami, nagłówek i pusta strefa upuszczania. */
export interface SectionReorder {
  state: SectionDropState
  onDragOver: (e: DragEvent<HTMLElement>) => void
  onDrop: (e: DragEvent<HTMLElement>) => void
}

interface Drag {
  id: number
  fromKey: string
}

interface Over {
  groupKey: string
  target?: DropTarget
}

const sameOver = (a: Over | null, b: Over | null): boolean =>
  a?.groupKey === b?.groupKey && a?.target?.id === b?.target?.id && a?.target?.placement === b?.target?.placement

const focusCard = (id: number): void => {
  document.querySelector<HTMLElement>(`[data-task-id="${id}"]`)?.focus()
}

/**
 * Przeciąganie zadań w obrębie listy: zmiana kolejności oraz przenoszenie między sekcjami,
 * które mają `patch` (data, obszar). Reaguje tylko na przeciągnięcia rozpoczęte na tej liście.
 * getData() jest niedostępne podczas dragover — id przeciąganej karty trzymamy w refie.
 */
export function useTaskReorder({ groups, onMoved }: { groups: TaskGroup[]; onMoved: () => Promise<void> | void }) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const [over, setOver] = useState<Over | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const overRef = useRef<Over | null>(null)

  const updateOver = (next: Over | null): void => {
    if (sameOver(overRef.current, next)) return
    overRef.current = next
    setOver(next)
  }

  const reset = (): void => {
    dragRef.current = null
    setDrag(null)
    updateOver(null)
  }

  const ours = (e: DragEvent<HTMLElement>): Drag | null =>
    dragRef.current && e.dataTransfer.types.includes(TASK_DND_TYPE) ? dragRef.current : null

  const apply = async (id: number, plan: DropPlan): Promise<void> => {
    try {
      if (plan.target) await api.entries.move(id, plan.target.id, plan.target.placement, plan.patch)
      else if (plan.patch) await api.entries.update(id, plan.patch)
    } catch {
      // Nieaktualny cel / wyścig — i tak odświeżamy, żeby lista nie została w połowie.
    }
    await onMoved()
  }

  const commit = (): void => {
    const d = dragRef.current
    const o = overRef.current
    reset()
    if (!d || !o) return
    const group = groups.find((g) => g.key === o.groupKey)
    const plan = group ? planDrop(d.id, d.fromKey, group, o.target) : null
    if (plan) void apply(d.id, plan)
  }

  const bindCard = (item: TaskListItem, group: TaskGroup): CardReorder => ({
    indicator: over?.groupKey === group.key && over.target?.id === item.id ? over.target.placement : null,
    onDragStart: () => {
      const d = { id: item.id, fromKey: group.key }
      dragRef.current = d
      setDrag(d)
    },
    onDragEnd: reset,
    onDragOver: (e) => {
      const d = ours(e)
      if (!d) return
      e.stopPropagation() // odstępy obsługuje sekcja
      if (!canDrop(d.fromKey, group)) {
        updateOver(null) // bez preventDefault → kursor „niedozwolone"
        return
      }
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (item.id === d.id) {
        updateOver({ groupKey: group.key }) // własne miejsce: bez linii, upuszczenie = nic
        return
      }
      const rect = e.currentTarget.getBoundingClientRect() // synchronicznie, przed setState
      updateOver({ groupKey: group.key, target: { id: item.id, placement: placementFromPointer(e.clientY, rect.top, rect.height) } })
    },
    onDrop: (e) => {
      if (!dragRef.current) return
      e.preventDefault()
      e.stopPropagation()
      commit()
    },
    onMoveKey: (dir) => {
      const target = keyboardTarget(group, item.id, dir)
      if (!target) return
      void apply(item.id, { target }).then(() => requestAnimationFrame(() => focusCard(item.id)))
    }
  })

  const bindSection = (group: TaskGroup): SectionReorder => ({
    state: !drag
      ? 'idle'
      : over?.groupKey === group.key
        ? 'over'
        : canDrop(drag.fromKey, group)
          ? 'accept'
          : 'refuse',
    onDragOver: (e) => {
      const d = ours(e)
      if (!d || !canDrop(d.fromKey, group)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      // Odstęp w tej sekcji zachowuje linię przy karcie; nagłówek/pusta strefa = sama sekcja.
      if (overRef.current?.groupKey !== group.key) updateOver({ groupKey: group.key })
    },
    onDrop: (e) => {
      if (!dragRef.current) return
      e.preventDefault()
      commit()
    }
  })

  /** Wyjście kursora poza listę (np. na sidebar) czyści wskaźnik. */
  const listProps = {
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      const next = e.relatedTarget as Node | null
      if (!next || !e.currentTarget.contains(next)) updateOver(null)
    }
  }

  return { bindCard, bindSection, listProps, dragging: drag != null }
}
