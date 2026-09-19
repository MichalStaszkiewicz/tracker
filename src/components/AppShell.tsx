import type { ReactNode } from 'react'
import type { Area } from '@shared/types'
import { Sidebar, type NavKey } from './Sidebar'
import { TitleBar } from './TitleBar'

interface Props {
  current: NavKey
  onNavigate: (key: NavKey) => void
  areas: Area[]
  activeAreaId?: number | null
  onAreaSelect: (area: Area) => void
  children: ReactNode
}

export function AppShell({ current, onNavigate, areas, activeAreaId, onAreaSelect, children }: Props) {
  return (
    <div className="app">
      <TitleBar />
      <div className="body">
        <Sidebar
          current={current}
          onNavigate={onNavigate}
          areas={areas}
          activeAreaId={activeAreaId}
          onAreaSelect={onAreaSelect}
        />
        <main style={{ position: 'relative', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
