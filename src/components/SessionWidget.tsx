import { useT } from '@/i18n'
import { formatStopwatch } from '@/lib/format'
import type { SessionActive } from '@shared/types'
import { Icon } from './Icon'

interface Props {
  active: SessionActive | null
  elapsed: number
  entryTitle: string | null
  areaColor: string | null
  onStop: () => void
}

export function SessionWidget({ active, elapsed, entryTitle, areaColor, onStop }: Props) {
  const { t } = useT()
  if (!active) return null

  return (
    <div className="session">
      <div className="session__bar">
        <span className="session__label">{t('session.label')}</span>
      </div>
      <div className="session__body">
        <div className="session__time">{formatStopwatch(elapsed)}</div>
        {entryTitle && (
          <div className="session__entry">
            <span className="areadot" style={{ background: areaColor ?? 'var(--color-neutral-700)' }} />
            <span>{entryTitle}</span>
          </div>
        )}
        <div className="session__actions">
          <button className="session__stop" onClick={onStop}>
            {t('session.stop')}
          </button>
          <button className="iconbtn" aria-label="Pauza">
            <Icon name="pause" size={12} />
          </button>
          <button className="iconbtn" aria-label="Zmień wpis">
            <Icon name="arrows-left-right" size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
