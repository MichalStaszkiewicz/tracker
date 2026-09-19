import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import type { TaskStatus } from '@shared/types'

const DOT: Record<TaskStatus, { background?: string; boxShadow?: string }> = {
  in_progress: { background: 'var(--color-accent)' },
  todo: { boxShadow: 'inset 0 0 0 1px var(--color-neutral-600)' },
  done: { background: 'var(--r-good)' }
}

interface Props {
  status: TaskStatus
  count: number
  gap?: boolean
}

export function SectionHeader({ status, count, gap }: Props) {
  const { t } = useT()
  return (
    <div className={`section${gap ? ' section--gap' : ''}`}>
      <span className="section__dot" style={DOT[status]} />
      <span className="section__label">{t(`status.${status}` as StringKey)}</span>
      <span className="section__count">{count}</span>
    </div>
  )
}
