import type { ReactNode } from 'react'
import type { SectionReorder } from '@/hooks/useTaskReorder'
import type { TaskStatus } from '@shared/types'
import { SectionHeader } from './SectionHeader'

interface Props {
  count: number
  gap?: boolean
  status?: TaskStatus
  label?: string
  /** Przeciąganie: odstępy, nagłówek i pusta strefa sekcji. */
  drop?: SectionReorder
  /** Tekst pustej strefy (sekcja bez zadań, np. „Jutro"). */
  emptyHint?: string
  children: ReactNode
}

/** Sekcja listy zadań: nagłówek + karty; pusta sekcja pokazuje strefę upuszczania. */
export function TaskSection({ count, gap, status, label, drop, emptyHint, children }: Props) {
  const state = drop?.state ?? 'idle'
  return (
    <div className={`tsection tsection--${state}`} onDragOver={drop?.onDragOver} onDrop={drop?.onDrop}>
      <SectionHeader status={status} label={label} count={count} gap={gap} />
      {children}
      {count === 0 && <div className="tsection__drop">{emptyHint}</div>}
    </div>
  )
}
