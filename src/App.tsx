import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import type { NavKey } from '@/components/Sidebar'
import { useAreas } from '@/hooks/useAreas'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import { Tasks } from '@/screens/Tasks'

export function App() {
  const [screen, setScreen] = useState<NavKey>('tasks')
  const areas = useAreas()

  return (
    <AppShell current={screen} onNavigate={setScreen} areas={areas}>
      {screen === 'tasks' ? <Tasks /> : <Placeholder screen={screen} />}
    </AppShell>
  )
}

function Placeholder({ screen }: { screen: NavKey }) {
  const { t } = useT()
  return (
    <div className="screen">
      <div className="loading">{t(`nav.${screen}` as StringKey)} — wkrótce</div>
    </div>
  )
}
