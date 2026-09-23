import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

export interface MenuItem {
  key: string
  label: string
  icon?: string
  dot?: string | null
  /** Tekst pomocniczy po prawej (mono), np. rozwinięta data opcji. */
  hint?: string
}

interface Props {
  trigger: ReactNode
  items: MenuItem[]
  activeKey?: string | null
  onSelect: (key: string) => void
  align?: 'left' | 'right'
  ariaLabel?: string
  /** Dodatkowa treść pod listą (np. pole tekstowe); `close` zamyka menu. */
  footer?: (close: () => void) => ReactNode
}

export function Menu({ trigger, items, activeKey, onSelect, align = 'left', ariaLabel, footer }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="menu" ref={ref}>
      <button
        className={`chip${open ? ' chip--active' : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
        <Icon name="caret-down" size={9} />
      </button>
      {open && (
        <div className={`menu__pop menu__pop--${align}`}>
          {items.map((it) => (
            <button
              key={it.key}
              className={`menu__item${it.key === activeKey ? ' menu__item--active' : ''}`}
              onClick={() => {
                onSelect(it.key)
                close()
              }}
            >
              {it.dot != null && <span className="areadot" style={{ background: it.dot }} />}
              {it.icon && <Icon name={it.icon} size={13} />}
              <span className="menu__label">{it.label}</span>
              {it.hint && <span className="menu__hint">{it.hint}</span>}
              {it.key === activeKey && <Icon name="check" size={12} />}
            </button>
          ))}
          {footer && <div className="menu__foot">{footer(close)}</div>}
        </div>
      )}
    </div>
  )
}
