import { useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { daysUntil, formatDuration, formatStopwatch, secondsSince, shortDate } from '@/lib/format'
import type { Tag, TaskListItem } from '@shared/types'
import { Icon } from './Icon'

interface Props {
  item: TaskListItem
  onToggle: (id: number) => void
  onOpen?: (id: number) => void
}

export function TaskCard({ item, onToggle, onOpen }: Props) {
  const { t } = useT()
  const [completing, setCompleting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const done = item.completedAt != null || item.stage?.isDone === true
  const showDone = done || completing

  const handleCheck = () => {
    if (done) {
      onToggle(item.id) // cofnięcie — od razu
      return
    }
    setCompleting(true) // animacja oddania, potem przeniesienie
    window.setTimeout(() => onToggle(item.id), 280)
  }

  const cls = ['card']
  if (item.activeSession) cls.push('card--active')
  if (showDone) cls.push('card--done')
  if (completing) cls.push('card--completing')
  if (dragging) cls.push('card--dragging')

  return (
    <div
      className={cls.join(' ')}
      draggable
      onDragStart={(e) => {
        // Dedykowany typ MIME — cele upuszczenia rozpoznają przeciąganie karty (nie dowolny tekst).
        e.dataTransfer.setData('application/x-task-id', String(item.id))
        e.dataTransfer.setData('text/plain', String(item.id))
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onOpen?.(item.id)}
    >
      <span className="card__bar" style={{ background: item.area?.color ?? 'var(--color-neutral-700)' }} />
      <button
        className={`card__check${showDone ? ' card__check--done' : ''}`}
        aria-label={done ? t('card.uncheck') : t('card.check')}
        onClick={(e) => {
          e.stopPropagation()
          handleCheck()
        }}
      >
        {showDone && <Icon name="check" size={11} />}
      </button>

      <div className="card__body">
        <div className="card__titlerow">
          <span className="card__title">{item.title}</span>
          {item.activeSession && <ActiveElapsed startedAt={item.activeSession.startedAt} />}
        </div>
        <div className="card__meta">
          <span className="metatype">
            <Icon name={item.type.icon} size={13} />
            {item.type.key}
          </span>
          {item.parent && (
            <>
              <span className="metasep" />
              <span className="metaparent">
                <Icon name="arrow-elbow-up-left" size={12} />
                <span>{item.parent.title}</span>
              </span>
            </>
          )}
          {!item.parent && (
            <>
              <span className="metasep" />
              <span className="metatype" style={{ textTransform: 'none' }}>
                <Icon name="tray" size={12} />
                {t('card.noParent')}
              </span>
            </>
          )}
          {item.tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </div>
      </div>

      <div className="card__right">
        {item.area && <span className="card__area">{item.area.name}</span>}
        <RightMetric item={item} />
      </div>
    </div>
  )
}

function TagChip({ tag }: { tag: Tag }) {
  if (tag.groupName === 'skill') {
    return (
      <span className="tag tag--skill">
        <span className="tag__group">skill:</span>
        {tag.name}
      </span>
    )
  }
  return (
    <span className="tag">
      <span className="tag__group">{tag.groupName}:</span>
      {tag.name}
    </span>
  )
}

function ActiveElapsed({ startedAt }: { startedAt: string }) {
  const [sec, setSec] = useState(() => secondsSince(startedAt))
  useEffect(() => {
    const id = setInterval(() => setSec(secondsSince(startedAt)), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return (
    <span className="card__elapsed">
      <span className="card__pulse" />
      {formatStopwatch(sec)}
    </span>
  )
}

function RightMetric({ item }: { item: TaskListItem }) {
  const { t } = useT()

  const progress = item.childProgress ?? item.counter
  if (progress) {
    const done = 'done' in progress ? progress.done : progress.current
    const ratio = progress.total > 0 ? Math.min(1, done / progress.total) : 0
    return (
      <span className="progress">
        <span className="progress__track">
          <span className="progress__fill" style={{ width: `${ratio * 100}%` }} />
        </span>
        <span className="progress__label">{`${done}/${progress.total}`}</span>
      </span>
    )
  }

  const dateKey = item.plannedDate ?? item.dueDate
  if (dateKey) {
    const isDue = item.plannedDate == null && item.dueDate != null
    const d = daysUntil(dateKey)
    if (isDue && d < 0) return <span className="card__metric card__metric--bad">{t('card.overdue', { n: -d })}</span>
    if (d === 0) return <span className="card__metric card__metric--warn">{t('card.today')}</span>
    if (d === 1) return <span className="card__metric card__metric--warn">{t('card.tomorrow')}</span>
    return <span className="card__metric">{shortDate(dateKey)}</span>
  }

  if (item.secondsSpent > 0) {
    return <span className="card__metric">{formatDuration(item.secondsSpent)}</span>
  }
  return null
}
