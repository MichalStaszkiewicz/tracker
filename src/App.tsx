import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import type { NavKey } from '@/components/Sidebar'
import { useAreas } from '@/hooks/useAreas'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useSettings } from '@/hooks/useSettings'
import { requestQuickAddFocus } from '@/lib/quick-add-focus'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import { Settings } from '@/screens/Settings'
import { Tasks } from '@/screens/Tasks'

const SCREEN_BY_NUMBER: Record<string, NavKey> = {
  'ctrl+1': 'tasks',
  'ctrl+2': 'inbox',
  'ctrl+3': 'board',
  'ctrl+4': 'offers',
  'ctrl+5': 'stats'
}

export function App() {
  const [screen, setScreen] = useState<NavKey>('tasks')
  const areas = useAreas()
  const { settings, set } = useSettings()
  const { setLang } = useT()

  // Język w SETTING → przełączany na żywo.
  useEffect(() => setLang(settings.language), [settings.language, setLang])

  const focusAdd = () => {
    setScreen('tasks')
    requestQuickAddFocus()
  }

  useHotkeys({
    ...Object.fromEntries(
      Object.entries(SCREEN_BY_NUMBER).map(([combo, key]) => [combo, () => setScreen(key)])
    ),
    'ctrl+shift+space': focusAdd,
    'ctrl+arrowup': focusAdd
  })

  return (
    <AppShell current={screen} onNavigate={setScreen} areas={areas}>
      {screen === 'tasks' ? (
        <Tasks />
      ) : screen === 'settings' ? (
        <Settings settings={settings} set={set} />
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
