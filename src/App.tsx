import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import type { NavKey } from '@/components/Sidebar'
import { useAreas } from '@/hooks/useAreas'
import { useHotkeys } from '@/hooks/useHotkeys'
import { requestQuickAddFocus } from '@/lib/quick-add-focus'
import { useSettingsCtx } from '@/settings-context'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import type { Area } from '@shared/types'
import { Board } from '@/screens/Board'
import { Profile } from '@/screens/Profile'
import { Settings } from '@/screens/Settings'
import { Stats } from '@/screens/Stats'
import { Tasks } from '@/screens/Tasks'

export function App() {
  const [screen, setScreen] = useState<NavKey>('tasks')
  const [taskArea, setTaskArea] = useState<{ id: number; name: string } | null>(null)
  const areas = useAreas()
  const { shortcuts } = useSettingsCtx()

  const navigate = (key: NavKey) => {
    if (key === 'tasks') setTaskArea(null) // pełna lista Zadań
    setScreen(key)
  }
  const selectArea = (area: Area) => {
    setTaskArea({ id: area.id, name: area.name })
    setScreen('tasks')
  }

  const focusAdd = () => {
    setScreen('tasks')
    requestQuickAddFocus()
  }

  useHotkeys({
    [shortcuts['screen.tasks']]: () => navigate('tasks'),
    [shortcuts['screen.inbox']]: () => navigate('inbox'),
    [shortcuts['screen.board']]: () => navigate('board'),
    [shortcuts['screen.offers']]: () => navigate('offers'),
    [shortcuts['screen.stats']]: () => navigate('stats'),
    [shortcuts.quickAdd]: focusAdd,
    'ctrl+arrowup': focusAdd
  })

  return (
    <AppShell
      current={screen}
      onNavigate={navigate}
      areas={areas}
      activeAreaId={screen === 'tasks' ? taskArea?.id ?? null : null}
      onAreaSelect={selectArea}
    >
      {screen === 'tasks' ? (
        <Tasks areaFilter={taskArea} onClearArea={() => setTaskArea(null)} />
      ) : screen === 'board' ? (
        <Board />
      ) : screen === 'stats' ? (
        <Stats />
      ) : screen === 'settings' ? (
        <Settings />
      ) : screen === 'profile' ? (
        <Profile />
      ) : (
        <Placeholder screen={screen} />
      )}
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
