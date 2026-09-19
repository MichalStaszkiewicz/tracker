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
  { key: 'inbox', icon: 'tray', kbd: '⌃2', badge: 7 },
  { key: 'board', icon: 'columns', kbd: '⌃3' },
  { key: 'offers', icon: 'briefcase', kbd: '⌃4' },
  { key: 'stats', icon: 'chart-bar', kbd: '⌃5' }
]

const FOOT_NAV: NavDef[] = [
  { key: 'profile', icon: 'user' },
  { key: 'settings', icon: 'gear' }
]

interface Props {
  current: NavKey
  onNavigate: (key: NavKey) => void
  areas: Area[]
}

export function Sidebar({ current, onNavigate, areas }: Props) {
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
      <div className="sidebar__label">{t('nav.areas')}</div>
      {areas.map((a) => (
        <div className="areaitem" key={a.id}>
          <span className="areadot" style={{ background: a.color }} />
          {a.name}
        </div>
      ))}
      <div className="sidebar__foot">{FOOT_NAV.map(item)}</div>
    </nav>
  )
}
