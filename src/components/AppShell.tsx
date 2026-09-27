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
  onAddArea: () => void
  onAreaDrop?: (area: Area, taskId: number) => void
  onOpenPalette: () => void
  /** Widoczny dok sesji — ekrany rezerwują pod nim miejsce (nic nie znika pod widżetem). */
  dock?: boolean
  children: ReactNode
}

export function AppShell({
  current,
  onNavigate,
  areas,
  activeAreaId,
  onAreaSelect,
  onAddArea,
  onAreaDrop,
  onOpenPalette,
  dock,
  children
}: Props) {
  return (
    <div className="app">
      <TitleBar onOpenPalette={onOpenPalette} />
      <div className="body">
        <Sidebar
          current={current}
          onNavigate={onNavigate}
          areas={areas}
          activeAreaId={activeAreaId}
          onAreaSelect={onAreaSelect}
          onAddArea={onAddArea}
          onAreaDrop={onAreaDrop}
        />
        <main className={dock ? 'main--dock' : undefined} style={{ position: 'relative', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
