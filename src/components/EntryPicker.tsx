import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { useEntryPicker } from '@/hooks/useEntryPicker'
import { Icon } from './Icon'

interface Props {
  onPick: (entryId: number) => void
  onClose: () => void
  /** Dostępna nazwa okna (np. „Przełącz zadanie"). */
  label: string
  placeholder: string
  emptyText: string
  /** Przycisk, który otwiera/zamyka wybór — klik na nim nie jest „kliknięciem obok". */
  ignoreRef?: RefObject<HTMLElement | null>
}

/** Wyszukiwarka zadań w dymku (combobox): strzałki wybierają, Enter zatwierdza, Esc / klik obok zamyka. */
export function EntryPicker({ onPick, onClose, label, placeholder, emptyText, ignoreRef }: Props) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const items = useEntryPicker(query)
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()
  const hi = Math.max(0, Math.min(highlight, items.length - 1)) // wyniki mogły się skurczyć
  const optionId = (i: number) => `${listId}-opt-${i}`

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || ignoreRef?.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [onClose, ignoreRef])

  return (
    <div className="picker" ref={ref} role="dialog" aria-label={label}>
      <input
        className="pinput pinput--sm"
        autoFocus
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={listId}
        aria-activedescendant={items.length > 0 ? optionId(hi) : undefined}
        aria-autocomplete="list"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.currentTarget.value // synchronicznie, nie w updaterze
          setQuery(next)
          setHighlight(0) // nowa fraza → od pierwszego wyniku (nie w efekcie: ten nadpisałby strzałki)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight(Math.min(hi + 1, items.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight(Math.max(hi - 1, 0))
          } else if (e.key === 'Enter') {
            const it = items[hi]
            if (it) {
              e.preventDefault()
              onPick(it.id)
            }
          } else if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation() // Esc zamyka tylko wybór, nie inne okna
            onClose()
          }
        }}
      />
      <div className="picker__list" role="listbox" id={listId}>
        {items.map((it, i) => (
          <button
            key={it.id}
            id={optionId(i)}
            role="option"
            aria-selected={i === hi}
            tabIndex={-1}
            className={`menu__item${i === hi ? ' picker__item--hi' : ''}`}
            onMouseEnter={() => setHighlight(i)}
            onClick={() => onPick(it.id)}
          >
            {it.areaColor && <span className="areadot" style={{ background: it.areaColor }} />}
            <Icon name={it.icon} size={13} />
            <span className="menu__label">{it.title}</span>
          </button>
        ))}
        {items.length === 0 && <div className="picker__empty">{emptyText}</div>}
      </div>
    </div>
  )
}
