import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import type { TaskStatus } from '@shared/types'

const DOT: Record<TaskStatus, { background?: string; boxShadow?: string }> = {
  in_progress: { background: 'var(--color-accent)' },
  todo: { boxShadow: 'inset 0 0 0 1px var(--color-neutral-600)' },
  done: { background: 'var(--r-good)' }
}

interface Props {
  count: number
  gap?: boolean
  status?: TaskStatus
  label?: string
}

export function SectionHeader({ count, gap, status, label }: Props) {
  const { t } = useT()
  const dot = status ? DOT[status] : { boxShadow: 'inset 0 0 0 1px var(--color-neutral-600)' }
  // Jawna etykieta wygrywa (np. sekcja „Zrobione" przy grupowaniu po dacie); status daje kropkę i domyślny tekst.
  const text = label ?? (status ? t(`status.${status}` as StringKey) : '')
  return (
    <div className={`section${gap ? ' section--gap' : ''}`}>
      <span className="section__dot" style={dot} />
      <span className="section__label">{text}</span>
      <span className="section__count">{count}</span>
    </div>
  )
}
