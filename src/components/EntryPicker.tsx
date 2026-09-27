import { useEffect, useRef, useState } from 'react'
import { useEntryPicker } from '@/hooks/useEntryPicker'
import { Icon } from './Icon'

interface Props {
  onPick: (entryId: number) => void
  onClose: () => void
  placeholder: string
  emptyText: string
}

/** Wyszukiwarka zadań w dymku: strzałki wybierają, Enter zatwierdza, Esc / klik obok zamyka. */
export function EntryPicker({ onPick, onClose, placeholder, emptyText }: Props) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const items = useEntryPicker(query)
  const ref = useRef<HTMLDivElement>(null)
  const hi = Math.max(0, Math.min(highlight, items.length - 1)) // wyniki mogły się skurczyć

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [onClose])

  return (
    <div className="picker" ref={ref} role="dialog">
      <input
        className="pinput pinput--sm"
        autoFocus
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
            onClose()
          }
        }}
      />
      <div className="picker__list" role="listbox">
        {items.map((it, i) => (
          <button
            key={it.id}
            role="option"
            aria-selected={i === hi}
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
