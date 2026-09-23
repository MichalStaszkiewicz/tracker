import { useState } from 'react'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import { TASK_DND_TYPE } from '@/lib/list-dnd'
import type { Area } from '@shared/types'
import { Icon } from './Icon'

export type NavKey = 'tasks' | 'inbox' | 'board' | 'offers' | 'stats' | 'profile' | 'settings'

interface NavDef {
  key: NavKey
  icon: string
  kbd?: string
  badge?: number
}

const MAIN_NAV: NavDef[] = [
  { key: 'tasks', icon: 'check-square', kbd: '⌃1' },
  // Ukryte na razie — do ewentualnego rozwinięcia później:
  // { key: 'inbox', icon: 'tray', kbd: '⌃2', badge: 7 },
  // { key: 'board', icon: 'columns', kbd: '⌃3' },
  { key: 'offers', icon: 'briefcase', kbd: '⌃2' },
  { key: 'stats', icon: 'chart-bar', kbd: '⌃3' }
]

const FOOT_NAV: NavDef[] = [
  // { key: 'profile', icon: 'user' },  // ukryte na razie
  { key: 'settings', icon: 'gear' }
]

interface Props {
  current: NavKey
  onNavigate: (key: NavKey) => void
  areas: Area[]
  activeAreaId?: number | null
  onAreaSelect: (area: Area) => void
  onAddArea: () => void
  onAreaDrop?: (area: Area, taskId: number) => void
}

export function Sidebar({ current, onNavigate, areas, activeAreaId, onAreaSelect, onAddArea, onAreaDrop }: Props) {
  const { t } = useT()
  const [overAreaId, setOverAreaId] = useState<number | null>(null)

  const item = (def: NavDef) => (
    <button
      key={def.key}
      className={`navitem${def.key === current ? ' navitem--active' : ''}`}
      onClick={() => onNavigate(def.key)}
    >
      <Icon name={def.icon} />
      {t(`nav.${def.key}` as StringKey)}
      <span className="navitem__kbd">
        {def.badge != null && <span className="navitem__badge">{def.badge}</span>} {def.kbd}
      </span>
    </button>
  )

  return (
    <nav className="sidebar">
      {MAIN_NAV.map(item)}
      <div className="sidebar__sep" />
      <div className="sidebar__areahead">
        <span className="sidebar__label">{t('nav.areas')}</span>
        <button className="sidebar__addarea" aria-label={t('area.new')} onClick={onAddArea}>
          <Icon name="plus" size={12} />
        </button>
      </div>
      {areas.map((a) => {
        const cls = ['areaitem']
        if (a.id === activeAreaId) cls.push('areaitem--active')
        if (a.id === overAreaId) cls.push('areaitem--over')
        return (
          <button
            type="button"
            className={cls.join(' ')}
            key={a.id}
            onClick={() => onAreaSelect(a)}
            onDragOver={
              onAreaDrop
                ? (e) => {
                    // Tylko przeciąganie karty zadania; reasercja na każdy tick leczy migotanie od dzieci.
                    if (!e.dataTransfer.types.includes(TASK_DND_TYPE)) return
                    e.preventDefault()
                    setOverAreaId(a.id)
                  }
                : undefined
            }
            onDragLeave={onAreaDrop ? () => setOverAreaId((id) => (id === a.id ? null : id)) : undefined}
            onDrop={
              onAreaDrop
                ? (e) => {
                    e.preventDefault()
                    setOverAreaId(null)
                    const raw = e.dataTransfer.getData(TASK_DND_TYPE)
                    if (!raw) return
                    const taskId = Number(raw)
                    if (taskId) onAreaDrop(a, taskId)
                  }
                : undefined
            }
          >
            <span className="areadot" style={{ background: a.color }} />
            {a.name}
          </button>
        )
      })}
      <div className="sidebar__foot">{FOOT_NAV.map(item)}</div>
    </nav>
  )
}
