import { useRef, useState } from 'react'
import { useStopwatch } from '@/hooks/useStopwatch'
import { useT } from '@/i18n'
import { formatStopwatch } from '@/lib/format'
import type { PausedSession, SessionActive } from '@shared/types'
import { EntryPicker } from './EntryPicker'
import { Icon } from './Icon'

interface Props {
  active: SessionActive | null
  paused: PausedSession | null
  onStop: () => void
  onPause: () => void
  onResume: () => void
  onSwitch: (entryId: number) => void
}

/**
 * Widżet sesji — App renderuje go tylko, gdy sesja trwa albo jest wstrzymana (dzięki temu
 * stan wyszukiwarki ⇆ nie przeżywa zakończenia sesji). Licznik tyka tylko tutaj.
 */
export function SessionWidget({ active, paused, onStop, onPause, onResume, onSwitch }: Props) {
  const { t } = useT()
  const [picking, setPicking] = useState(false)
  const switchRef = useRef<HTMLButtonElement>(null)
  const elapsed = useStopwatch(active?.startedAt ?? null, active?.carriedSeconds ?? paused?.carriedSeconds ?? 0)
  const current = active ?? paused
  if (!current) return null

  const closePicker = () => {
    setPicking(false)
    switchRef.current?.focus() // fokus wraca tam, skąd otwarto (klawiatura/czytnik ekranu)
  }

  return (
    <div className="sessiondock">
      {picking && (
        <EntryPicker
          label={t('session.switch')}
          placeholder={t('session.switchPlaceholder')}
          emptyText={t('session.switchEmpty')}
          ignoreRef={switchRef}
          onClose={closePicker}
          onPick={(id) => {
            closePicker()
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
              ref={switchRef}
              className={`iconbtn${picking ? ' iconbtn--active' : ''}`}
              aria-label={t('session.switch')}
              title={t('session.switch')}
              aria-expanded={picking}
              aria-haspopup="dialog"
              onClick={() => setPicking((open) => !open)}
            >
              <Icon name="arrows-left-right" size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
