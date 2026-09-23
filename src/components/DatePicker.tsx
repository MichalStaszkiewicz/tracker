import { useState } from 'react'
import { useT } from '@/i18n'
import { relativeDay, weekdayDate } from '@/lib/dates'
import { addDaysKey, nextWeekdayKey, parseDateWord, toDateKey } from '@shared/dates'
import { Icon } from './Icon'
import { Menu, type MenuItem } from './Menu'

const CLEAR = '__clear'

interface Props {
  value: string | null
  onChange: (value: string | null) => void
  ariaLabel: string
  align?: 'left' | 'right'
}

/**
 * Wybór daty: szybkie opcje (Dziś / Jutro / Przyszły tydzień) + pole tekstowe z tą samą
 * gramatyką co „@" w szybkim dodawaniu (jutro, pt, 25.09, +3…). Bez natywnego
 * <input type=date> — Chromium zgłasza zmiany z częściowym rokiem w trakcie pisania.
 */
export function DatePicker({ value, onChange, ariaLabel, align = 'left' }: Props) {
  const { t, lang } = useT()
  const now = new Date()
  const today = toDateKey(now)

  const label = (key: string): string => {
    const rel = relativeDay(key, now)
    if (rel === 'today') return t('date.today')
    if (rel === 'tomorrow') return t('date.tomorrow')
    if (rel === 'yesterday') return t('date.yesterday')
    return weekdayDate(key, lang)
  }

  const quick = [
    { key: today, label: t('date.today') },
    { key: addDaysKey(today, 1), label: t('date.tomorrow') },
    { key: nextWeekdayKey(now, 1), label: t('date.nextWeek') }
  ]
  const items: MenuItem[] = [
    ...quick.map((q) => ({ key: q.key, label: q.label, hint: weekdayDate(q.key, lang) })),
    ...(value ? [{ key: CLEAR, label: t('date.clear'), icon: 'x' }] : [])
  ]

  return (
    <Menu
      align={align}
      ariaLabel={ariaLabel}
      trigger={
        <>
          <Icon name="calendar" size={13} />
          <span className={value ? 'datepick__value' : 'datepick__empty'}>{value ? label(value) : t('date.none')}</span>
        </>
      }
      items={items}
      activeKey={value}
      onSelect={(k) => onChange(k === CLEAR ? null : k)}
      footer={(close) => (
        <DateTextInput
          onPick={(key) => {
            onChange(key)
            close()
          }}
        />
      )}
    />
  )
}

function DateTextInput({ onPick }: { onPick: (key: string) => void }) {
  const { t, lang } = useT()
  const [text, setText] = useState('')
  const parsed = text.trim() ? parseDateWord(text) : undefined

  return (
    <div className="datepick__input">
      <input
        className="pinput pinput--sm"
        autoFocus
        value={text}
        placeholder={t('date.inputPlaceholder')}
        onChange={(e) => {
          const next = e.currentTarget.value // czytane synchronicznie, nie w updaterze
          setText(next)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && parsed) {
            e.preventDefault()
            onPick(parsed)
          }
        }}
      />
      <span className="datepick__preview">
        {text.trim() ? (parsed ? `→ ${weekdayDate(parsed, lang)}` : t('date.unrecognized')) : ''}
      </span>
    </div>
  )
}
