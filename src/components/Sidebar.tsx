import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
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
}

export function Sidebar({ current, onNavigate, areas, activeAreaId, onAreaSelect, onAddArea }: Props) {
  const { t } = useT()

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
      {areas.map((a) => (
        <button
          type="button"
          className={`areaitem${a.id === activeAreaId ? ' areaitem--active' : ''}`}
          key={a.id}
          onClick={() => onAreaSelect(a)}
        >
          <span className="areadot" style={{ background: a.color }} />
          {a.name}
        </button>
      ))}
      <div className="sidebar__foot">{FOOT_NAV.map(item)}</div>
    </nav>
  )
}
