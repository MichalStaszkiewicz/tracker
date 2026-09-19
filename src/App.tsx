import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import type { NavKey } from '@/components/Sidebar'
import { useAreas } from '@/hooks/useAreas'
import { useHotkeys } from '@/hooks/useHotkeys'
import { requestQuickAddFocus } from '@/lib/quick-add-focus'
import { useSettingsCtx } from '@/settings-context'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import { Settings } from '@/screens/Settings'
import { Tasks } from '@/screens/Tasks'

export function App() {
  const [screen, setScreen] = useState<NavKey>('tasks')
  const areas = useAreas()
  const { shortcuts } = useSettingsCtx()

  const focusAdd = () => {
    setScreen('tasks')
    requestQuickAddFocus()
  }

  useHotkeys({
    [shortcuts['screen.tasks']]: () => setScreen('tasks'),
    [shortcuts['screen.inbox']]: () => setScreen('inbox'),
    [shortcuts['screen.board']]: () => setScreen('board'),
    [shortcuts['screen.offers']]: () => setScreen('offers'),
    [shortcuts['screen.stats']]: () => setScreen('stats'),
    [shortcuts.quickAdd]: focusAdd,
    'ctrl+arrowup': focusAdd
  })

  return (
    <AppShell current={screen} onNavigate={setScreen} areas={areas}>
      {screen === 'tasks' ? (
        <Tasks />
      ) : screen === 'settings' ? (
        <Settings />
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
