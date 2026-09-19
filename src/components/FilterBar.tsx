import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import type { TaskFilter } from '@shared/types'
import { Icon } from './Icon'

const FILTERS: TaskFilter[] = ['active', 'today', 'blocked', 'done']

interface Props {
  active: TaskFilter
  onChange: (f: TaskFilter) => void
}

export function FilterBar({ active, onChange }: Props) {
  const { t } = useT()
  return (
    <div className="filterbar">
      {FILTERS.map((f) => (
        <button
          key={f}
          className={`chip${f === active ? ' chip--active' : ''}`}
          onClick={() => onChange(f)}
        >
          {t(`filter.${f}` as StringKey)}
        </button>
      ))}
      <span className="filterbar__sep" />
      <button className="chip">
        <Icon name="funnel" size={13} />
        {t('filter.type')}
      </button>
      <button className="chip">
        <Icon name="hash" size={13} />
        {t('filter.tag')}
      </button>
      <span className="filterbar__group">
        {t('filter.group')}
        <Icon name="caret-down" size={9} />
      </span>
    </div>
  )
}
