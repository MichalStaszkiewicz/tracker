import { useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { Icon } from './Icon'

const COLORS = [
  'oklch(0.74 0.13 289)',
  'oklch(0.74 0.12 215)',
  'oklch(0.76 0.13 60)',
  'oklch(0.74 0.12 152)',
  'oklch(0.66 0.16 24)',
  'oklch(0.72 0.13 330)',
  'oklch(0.74 0.12 190)',
  'oklch(0.72 0.14 100)'
]

interface Props {
  onCreate: (name: string, color: string) => void
  onClose: () => void
}

export function AreaPopover({ onCreate, onClose }: Props) {
  const { t } = useT()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [onClose])

  const submit = () => {
    if (!name.trim()) return
    onCreate(name.trim(), color)
    onClose()
  }

  return (
    <div className="palette__backdrop" onMouseDown={onClose}>
      <div className="areapop areapop--modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="areapop__head">
          <Icon name="plus" size={13} />
          <span>{t('area.new')}</span>
        </div>
        <label className="areapop__field">
          <span className="areapop__label">{t('area.name')}</span>
          <input
            autoFocus
            className="pinput"
            value={name}
            placeholder={t('area.namePlaceholder')}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </label>
        <div className="areapop__field">
          <span className="areapop__label">{t('area.color')}</span>
          <div className="areapop__colors">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`areapop__dot${c === color ? ' areapop__dot--active' : ''}`}
                style={{ background: c }}
                aria-label={c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <div className="areapop__actions">
          <button className="btn" onClick={onClose}>
            {t('area.cancel')}
          </button>
          <button className="btn btn--accent" disabled={!name.trim()} onClick={submit}>
            {t('area.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
