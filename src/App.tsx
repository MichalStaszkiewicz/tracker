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
import { EntryDetail } from '@/screens/EntryDetail'
import { Profile } from '@/screens/Profile'
import { Settings } from '@/screens/Settings'
import { Stats } from '@/screens/Stats'
import { Tasks } from '@/screens/Tasks'

export function App() {
  const [screen, setScreen] = useState<NavKey>('tasks')
  const [taskArea, setTaskArea] = useState<{ id: number; name: string } | null>(null)
  const [openEntryId, setOpenEntryId] = useState<number | null>(null)
  const areas = useAreas()
  const { shortcuts } = useSettingsCtx()

  const navigate = (key: NavKey) => {
    setOpenEntryId(null)
    if (key === 'tasks') setTaskArea(null)
    setScreen(key)
  }
  const selectArea = (area: Area) => {
    setOpenEntryId(null)
    setTaskArea({ id: area.id, name: area.name })
    setScreen('tasks')
  }
  const focusAdd = () => {
    setOpenEntryId(null)
    setTaskArea(null)
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

  const content =
    openEntryId !== null ? (
      <EntryDetail
        key={openEntryId}
        id={openEntryId}
        onClose={() => setOpenEntryId(null)}
        onOpen={setOpenEntryId}
      />
    ) : screen === 'tasks' ? (
      <Tasks areaFilter={taskArea} onClearArea={() => setTaskArea(null)} onOpenEntry={setOpenEntryId} />
    ) : screen === 'board' ? (
      <Board onOpenEntry={setOpenEntryId} />
    ) : screen === 'stats' ? (
      <Stats />
    ) : screen === 'settings' ? (
      <Settings />
    ) : screen === 'profile' ? (
      <Profile />
    ) : (
      <Placeholder screen={screen} />
    )

  return (
    <AppShell
      current={screen}
      onNavigate={navigate}
      areas={areas}
      activeAreaId={screen === 'tasks' && openEntryId === null ? taskArea?.id ?? null : null}
      onAreaSelect={selectArea}
    >
      {content}
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
