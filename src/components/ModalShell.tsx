import { useEffect, useRef, type ReactNode } from 'react'
import { acquireModalLock } from '@/lib/modal-lock'
import { Icon } from './Icon'

interface Props {
  icon: string
  title: string
  /** Krótka odznaka w nagłówku (np. nazwa pliku, mono). */
  badge?: string
  /** Bez onClose modal jest nie do zamknięcia (Esc, tło i × nieaktywne) — np. w trakcie zapisu. */
  onClose?: () => void
  closeLabel: string
  footer: ReactNode
  children: ReactNode
}

/** Okno modalne: tło, nagłówek, treść i stopka. Póki jest otwarte, globalne skróty są zablokowane. */
export function ModalShell({ icon, title, badge, onClose, closeLabel, footer, children }: Props) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => acquireModalLock(), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !closeRef.current) return
      e.preventDefault()
      closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="palette__backdrop" onMouseDown={() => closeRef.current?.()}>
      <div
        className="importmodal modalshell"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="importmodal__head">
          <Icon name={icon} size={16} />
          <span className="importmodal__title">{title}</span>
          {badge && <span className="importmodal__file">{badge}</span>}
          {onClose && (
            <button className="iconbtn modalshell__close" aria-label={closeLabel} onClick={onClose}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
        <div className="importmodal__body">{children}</div>
        <div className="importmodal__foot">{footer}</div>
      </div>
    </div>
  )
}
