import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

export interface MenuItem {
  key: string
  label: string
  icon?: string
  dot?: string | null
}

interface Props {
  trigger: ReactNode
  items: MenuItem[]
  activeKey?: string | null
  onSelect: (key: string) => void
  align?: 'left' | 'right'
}

export function Menu({ trigger, items, activeKey, onSelect, align = 'left' }: Props) {
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

  return (
    <div className="menu" ref={ref}>
      <button className={`chip${open ? ' chip--active' : ''}`} onClick={() => setOpen((o) => !o)}>
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
                setOpen(false)
              }}
            >
              {it.dot != null && <span className="areadot" style={{ background: it.dot }} />}
              {it.icon && <Icon name={it.icon} size={13} />}
              <span className="menu__label">{it.label}</span>
              {it.key === activeKey && <Icon name="check" size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
