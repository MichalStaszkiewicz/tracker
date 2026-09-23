import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import type { GroupBy } from '@/lib/task-view'
import { TASK_GROUP_BYS, type EntryType, type Tag, type TaskFilter } from '@shared/types'
import { Icon } from './Icon'
import { Menu, type MenuItem } from './Menu'

const FILTERS: TaskFilter[] = ['active', 'today', 'blocked', 'done']
const GROUPS: readonly GroupBy[] = TASK_GROUP_BYS

interface Props {
  filter: TaskFilter
  onFilter: (f: TaskFilter) => void
  types: EntryType[]
  tags: Tag[]
  typeKey?: string
  tagId?: number
  query: string
  groupBy: GroupBy
  onTypeKey: (key?: string) => void
  onTagId: (id?: number) => void
  onQuery: (q: string) => void
  onGroupBy: (g: GroupBy) => void
  areaName?: string | null
  onClearArea?: () => void
}

export function FilterBar(props: Props) {
  const { t } = useT()
  const { types, tags, typeKey, tagId, query, groupBy } = props

  const typeItems: MenuItem[] = [
    { key: '', label: t('filter.allTypes') },
    ...types.map((ty) => ({ key: ty.key, label: ty.name, icon: ty.icon }))
  ]
  const tagItems: MenuItem[] = [
    { key: '', label: t('filter.allTags') },
    ...tags.map((tg) => ({ key: String(tg.id), label: `${tg.groupName}:${tg.name}` }))
  ]
  const groupItems: MenuItem[] = GROUPS.map((g) => ({ key: g, label: t(`group.${g}` as StringKey) }))

  const activeType = types.find((ty) => ty.key === typeKey)
  const activeTag = tags.find((tg) => tg.id === tagId)

  return (
    <div className="filterbar">
      {props.areaName && (
        <>
          <button className="chip chip--active" onClick={props.onClearArea}>
            <Icon name="cube" size={12} />
            {props.areaName}
            <Icon name="x" size={11} />
          </button>
          <span className="filterbar__sep" />
        </>
      )}
      {FILTERS.map((f) => (
        <button
          key={f}
          className={`chip${f === props.filter ? ' chip--active' : ''}`}
          onClick={() => props.onFilter(f)}
        >
          {t(`filter.${f}` as StringKey)}
        </button>
      ))}

      <span className="filterbar__sep" />

      <Menu
        trigger={
          <>
            <Icon name="funnel" size={13} />
            {activeType ? activeType.name : t('filter.type')}
          </>
        }
        items={typeItems}
        activeKey={typeKey ?? ''}
        onSelect={(k) => props.onTypeKey(k || undefined)}
      />
      <Menu
        trigger={
          <>
            <Icon name="hash" size={13} />
            {activeTag ? activeTag.name : t('filter.tag')}
          </>
        }
        items={tagItems}
        activeKey={tagId != null ? String(tagId) : ''}
        onSelect={(k) => props.onTagId(k ? Number(k) : undefined)}
      />

      <span className="filterbar__searchbox">
        <Icon name="magnifying-glass" size={12} />
        <input
          value={query}
          placeholder={t('filter.search')}
          onChange={(e) => props.onQuery(e.currentTarget.value)}
        />
      </span>

      <span className="filterbar__spacer" />

      <Menu
        align="right"
        trigger={
          <span className="filterbar__grouplabel">
            {t('filter.group')}: {t(`group.${groupBy}` as StringKey)}
          </span>
        }
        items={groupItems}
        activeKey={groupBy}
        onSelect={(k) => props.onGroupBy(k as GroupBy)}
      />
    </div>
  )
}
