import { Icon } from './Icon'

interface Props {
  icon: string
  title: string
  body?: string
  actions?: Array<{ key: string; label: string; onClick: () => void }>
  onDismiss?: () => void
  dismissLabel?: string
}

/** Neutralny baner z komunikatem, opcjonalnymi akcjami i zamknięciem. */
export function Notice({ icon, title, body, actions = [], onDismiss, dismissLabel }: Props) {
  return (
    <div className="notice" role="status">
      <Icon name={icon} size={16} />
      <div className="notice__text">
        <span className="notice__title">{title}</span>
        {body && (
          <span className="notice__body" title={body}>
            {body}
          </span>
        )}
      </div>
      {actions.map((a) => (
        <button key={a.key} className="btn" onClick={a.onClick}>
          {a.label}
        </button>
      ))}
      {onDismiss && (
        <button className="iconbtn" aria-label={dismissLabel} onClick={onDismiss}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  )
}
