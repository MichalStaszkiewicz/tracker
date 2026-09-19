import type { ReactNode } from 'react'
import type { Area } from '@shared/types'
import { Sidebar, type NavKey } from './Sidebar'
import { TitleBar } from './TitleBar'

interface Props {
  current: NavKey
  onNavigate: (key: NavKey) => void
  areas: Area[]
  children: ReactNode
}

export function AppShell({ current, onNavigate, areas, children }: Props) {
  return (
    <div className="app">
      <TitleBar />
      <div className="body">
        <Sidebar current={current} onNavigate={onNavigate} areas={areas} />
        <main style={{ position: 'relative', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
