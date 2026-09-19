import { useT } from '@/i18n'

export interface SubNavItem {
  key: string
  label: string
}

interface Props {
  items: SubNavItem[]
  current: string
  onSelect: (key: string) => void
}

export function SettingsSubNav({ items, current, onSelect }: Props) {
  const { t } = useT()
  return (
    <div className="subnav">
      <span className="subnav__label">{t('nav.settings')}</span>
      {items.map((it) => (
        <button
          key={it.key}
          className={`subnav__item${it.key === current ? ' subnav__item--active' : ''}`}
          onClick={() => onSelect(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
