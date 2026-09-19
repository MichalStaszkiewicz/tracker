import { useEffect, useState, type KeyboardEvent } from 'react'
import { api } from '@/api'
import { useT } from '@/i18n'
import type { EntrySearchResult } from '@shared/types'
import { Icon } from './Icon'

export interface PaletteAction {
  id: string
  icon: string
  label: string
  run: () => void
}

interface Props {
  actions: PaletteAction[]
  onClose: () => void
  onOpenEntry: (id: number) => void
}

export function CommandPalette({ actions, onClose, onOpenEntry }: Props) {
  const { t } = useT()
  const [q, setQ] = useState('')
  const [entries, setEntries] = useState<EntrySearchResult[]>([])
  const [hi, setHi] = useState(0)

  useEffect(() => {
    const needle = q.trim()
    if (!needle) {
      setEntries([])
      return
    }
    let alive = true
    void api.entries.search(needle).then((r) => {
      if (alive) setEntries(r)
    })
    return () => {
      alive = false
    }
  }, [q])

  useEffect(() => setHi(0), [q])

  const nq = q.trim().toLowerCase()
  const acts = nq ? actions.filter((a) => a.label.toLowerCase().includes(nq)) : actions
  const total = acts.length + entries.length

  const runIndex = (i: number) => {
    if (i < acts.length) {
      acts[i].run()
      onClose()
      return
    }
    const e = entries[i - acts.length]
    if (e) {
      onOpenEntry(e.id)
      onClose()
    }
  }

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      setHi((h) => Math.min(h + 1, total - 1))
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      setHi((h) => Math.max(h - 1, 0))
    } else if (ev.key === 'Enter') {
      ev.preventDefault()
      runIndex(hi)
    } else if (ev.key === 'Escape') {
      ev.preventDefault()
      onClose()
    }
  }

  return (
    <div className="palette__backdrop" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette__input">
          <span className="palette__prompt">›</span>
          <input
            autoFocus
            value={q}
            placeholder={t('pal.placeholder')}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
          />
          <span className="palette__esc">esc</span>
        </div>
        <div className="palette__list">
          {acts.length > 0 && <div className="palette__group">{t('pal.actions')}</div>}
          {acts.map((a, i) => (
            <button
              key={a.id}
              className={`palette__item${i === hi ? ' palette__item--active' : ''}`}
              onMouseEnter={() => setHi(i)}
              onClick={() => runIndex(i)}
            >
              <Icon name={a.icon} size={14} />
              <span className="palette__label">{a.label}</span>
            </button>
          ))}
          {entries.length > 0 && <div className="palette__group">{t('pal.entries')}</div>}
          {entries.map((e, j) => {
            const i = acts.length + j
            return (
              <button
                key={e.id}
                className={`palette__item${i === hi ? ' palette__item--active' : ''}`}
                onMouseEnter={() => setHi(i)}
                onClick={() => runIndex(i)}
              >
                <span className="areadot" style={{ background: e.areaColor ?? 'var(--color-neutral-700)' }} />
                <Icon name={e.icon} size={14} />
                <span className="palette__label">{e.title}</span>
                <span className="palette__hint">{e.subtitle}</span>
              </button>
            )
          })}
          {total === 0 && <div className="palette__empty">{t('pal.empty')}</div>}
        </div>
      </div>
    </div>
  )
}
