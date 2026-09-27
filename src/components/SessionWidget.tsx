import { useState } from 'react'
import type { PausedSession } from '@/hooks/useSession'
import { useStopwatch } from '@/hooks/useStopwatch'
import { useT } from '@/i18n'
import { formatStopwatch } from '@/lib/format'
import type { SessionActive } from '@shared/types'
import { EntryPicker } from './EntryPicker'
import { Icon } from './Icon'

interface Props {
  active: SessionActive | null
  paused: PausedSession | null
  carried: number
  onStop: () => void
  onPause: () => void
  onResume: () => void
  onSwitch: (entryId: number) => void
}

/** Widżet sesji — widoczny na każdym ekranie, dopóki sesja trwa albo jest wstrzymana. */
export function SessionWidget({ active, paused, carried, onStop, onPause, onResume, onSwitch }: Props) {
  const { t } = useT()
  const [picking, setPicking] = useState(false)
  const elapsed = useStopwatch(active?.startedAt ?? null, carried)
  const current = active ?? paused
  if (!current) return null

  return (
    <div className="sessiondock">
      {picking && (
        <EntryPicker
          placeholder={t('session.switchPlaceholder')}
          emptyText={t('session.switchEmpty')}
          onClose={() => setPicking(false)}
          onPick={(id) => {
            setPicking(false)
            onSwitch(id)
          }}
        />
      )}
      <div className={`session${paused ? ' session--paused' : ''}`}>
        <div className="session__bar">
          <span className="session__label">
            {t('session.label')}
            {paused && ` · ${t('session.paused')}`}
          </span>
        </div>
        <div className="session__body">
          <div className="session__time">{formatStopwatch(elapsed)}</div>
          <div className="session__entry">
            <span className="areadot" style={{ background: current.areaColor ?? 'var(--color-neutral-700)' }} />
            <span>{current.entryTitle ?? t('session.noEntry')}</span>
          </div>
          <div className="session__actions">
            <button className="session__stop" onClick={onStop}>
              {t('session.stop')}
            </button>
            {paused ? (
              <button className="iconbtn" aria-label={t('session.resume')} title={t('session.resume')} onClick={onResume}>
                <Icon name="play" size={12} />
              </button>
            ) : (
              <button className="iconbtn" aria-label={t('session.pause')} title={t('session.pause')} onClick={onPause}>
                <Icon name="pause" size={12} />
              </button>
            )}
            <button
              className={`iconbtn${picking ? ' iconbtn--active' : ''}`}
              aria-label={t('session.switch')}
              title={t('session.switch')}
              aria-expanded={picking}
              // Bez tego „klik obok" z wyszukiwarki zamknąłby ją, a klik zaraz otworzył ponownie.
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setPicking((p) => !p)}
            >
              <Icon name="arrows-left-right" size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
