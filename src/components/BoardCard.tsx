import { formatDuration } from '@/lib/format'
import type { TaskListItem } from '@shared/types'
import { Icon } from './Icon'

interface Props {
  item: TaskListItem
  onDragStart: (id: number) => void
  onDragEnd: () => void
  onOpen?: (id: number) => void
}

export function BoardCard({ item, onDragStart, onDragEnd, onOpen }: Props) {
  const progress = item.childProgress ?? item.counter
  const done = progress ? ('done' in progress ? progress.done : progress.current) : 0
  const ratio = progress && progress.total > 0 ? Math.min(1, done / progress.total) : 0
  const visibleTags = item.tags.filter((t) => t.groupName !== 'skill').slice(0, 3)

  return (
    <div
      className="bcard"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(item.id))
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(item.id)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen?.(item.id)}
    >
      <span className="bcard__bar" style={{ background: item.area?.color ?? 'var(--color-neutral-700)' }} />
      <div className="bcard__body">
        <div className="bcard__type">
          <Icon name={item.type.icon} size={13} />
          <span>{item.area?.name ?? item.type.name}</span>
        </div>
        <div className="bcard__title">{item.title}</div>
        {visibleTags.length > 0 && (
          <div className="bcard__tags">
            {visibleTags.map((tag) => (
              <span className="tag" key={tag.id}>
                <span className="tag__group">{tag.groupName}:</span>
                {tag.name}
              </span>
            ))}
          </div>
        )}
        {(progress || item.secondsSpent > 0) && (
          <div className="bcard__foot">
            {progress && (
              <span className="progress__track" style={{ flex: 1 }}>
                <span className="progress__fill" style={{ width: `${ratio * 100}%` }} />
              </span>
            )}
            {progress && <span className="progress__label">{`${done}/${progress.total}`}</span>}
            {item.secondsSpent > 0 && <span className="bcard__time">{formatDuration(item.secondsSpent)}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
