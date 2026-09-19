import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useT } from '@/i18n'
import { useParents, useTags, useTypes } from '@/hooks/useLookups'
import { fuzzyRank } from '@shared/fuzzy'
import {
  activeToken,
  applySuggestion,
  parseQuickAdd,
  type ActiveToken
} from '@shared/quick-add-parser'
import type { EntryType, ParentCandidate, Tag } from '@shared/types'
import { Icon } from './Icon'

interface Suggestion {
  value: string
  label: string
  icon?: string
  dot?: string | null
  hint?: string
}

const DATE_OPTS = ['dziś', 'jutro', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']

function computeSuggestions(
  active: ActiveToken,
  types: EntryType[],
  tags: Tag[],
  parents: ParentCandidate[]
): Suggestion[] {
  switch (active.marker) {
    case '/':
      return fuzzyRank(active.query, types, (t) => `${t.key} ${t.name}`)
        .slice(0, 8)
        .map((t) => ({ value: t.key, label: t.name, icon: t.icon, hint: `/${t.key}` }))
    case '#':
      return fuzzyRank(active.query, tags, (t) => `${t.groupName}:${t.name}`)
        .slice(0, 8)
        .map((t) => ({ value: `${t.groupName}:${t.name}`, label: t.name, hint: t.groupName }))
    case '>':
      return fuzzyRank(active.query, parents, (p) => p.title)
        .slice(0, 8)
        .map((p) => ({ value: p.title, label: p.title, icon: p.icon, dot: p.areaColor, hint: p.subtitle ?? undefined }))
    case '@':
      return fuzzyRank(active.query, DATE_OPTS, (d) => d)
        .slice(0, 8)
        .map((d) => ({ value: d, label: d, hint: 'data' }))
  }
}

export function QuickAdd({ onSubmit }: { onSubmit: (line: string) => void }) {
  const { t } = useT()
  const types = useTypes()
  const { tags } = useTags()
  const { parents } = useParents()
  const inputRef = useRef<HTMLInputElement>(null)

  const [value, setValue] = useState('')
  const [caret, setCaret] = useState(0)
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)

  const active = useMemo(() => activeToken(value, caret), [value, caret])
  const suggestions = useMemo(
    () => (active ? computeSuggestions(active, types, tags, parents) : []),
    [active, types, tags, parents]
  )
  const showSug = open && active !== null && suggestions.length > 0
  const parsed = useMemo(() => parseQuickAdd(value), [value])

  useEffect(() => setHi(0), [value, caret])

  const sync = (el: HTMLInputElement) => {
    setValue(el.value)
    setCaret(el.selectionStart ?? el.value.length)
    setOpen(true)
  }

  const accept = (s: Suggestion) => {
    if (!active) return
    const { text, caret: c } = applySuggestion(value, active, s.value)
    setValue(text)
    setOpen(true)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(c, c)
        setCaret(c)
      }
    })
  }

  const submit = () => {
    const line = value.trim()
    if (!line) return
    onSubmit(line)
    setValue('')
    setCaret(0)
    setOpen(false)
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showSug) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHi((h) => Math.min(h + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHi((h) => Math.max(h - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        accept(suggestions[hi])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  const knownType = types.find((ty) => ty.key === parsed.typeKey)
  const hasChips =
    parsed.typeKey != null ||
    parsed.tags.length > 0 ||
    parsed.parent != null ||
    parsed.plannedDate != null ||
    parsed.priority != null

  return (
    <div className="quickadd">
      <div className="quickadd__row">
        <Icon name="plus" size={14} />
        <input
          ref={inputRef}
          className="quickadd__input"
          value={value}
          placeholder={t('add.placeholder')}
          onChange={(e) => sync(e.currentTarget)}
          onClick={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
          onKeyUp={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
          onKeyDown={onKey}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
        <span className="quickadd__hint">{t('add.hint')}</span>
      </div>

      {hasChips && (
        <div className="quickadd__chips">
          {parsed.typeKey != null &&
            (knownType ? (
              <span className="qchip">
                <Icon name={knownType.icon} size={12} />
                {knownType.name}
              </span>
            ) : (
              <span className="qchip qchip--bad">/{parsed.typeKey}?</span>
            ))}
          {parsed.parent != null && (
            <span className="qchip">
              <Icon name="arrow-elbow-up-left" size={11} />
              {parsed.parent}
            </span>
          )}
          {parsed.tags.map((tg, i) => (
            <span key={i} className={`qchip${tg.group === 'skill' ? ' qchip--skill' : ''}`}>
              {tg.group && <span className="qchip__group">{tg.group}:</span>}
              {tg.name}
            </span>
          ))}
          {parsed.plannedDate != null && <span className="qchip">@{parsed.plannedDate}</span>}
          {parsed.priority != null && <span className="qchip">!{parsed.priority}</span>}
        </div>
      )}

      {showSug && (
        <div className="sug">
          <div className="sug__head">{t(active!.marker === '#' ? 'sug.tag' : active!.marker === '/' ? 'sug.type' : active!.marker === '>' ? 'sug.parent' : 'sug.date')}</div>
          {suggestions.map((s, i) => (
            <button
              key={s.value}
              className={`sug__item${i === hi ? ' sug__item--active' : ''}`}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                accept(s)
              }}
            >
              {s.dot != null && <span className="areadot" style={{ background: s.dot }} />}
              {s.icon && <Icon name={s.icon} size={13} />}
              <span className="sug__label">{s.label}</span>
              {s.hint && <span className="sug__hint">{s.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
