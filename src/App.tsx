import { useEffect, useState } from 'react'
import { api } from '@/api'
import { AppShell } from '@/components/AppShell'
import { AreaPopover } from '@/components/AreaPopover'
import { CommandPalette, type PaletteAction } from '@/components/CommandPalette'
import { SessionWidget } from '@/components/SessionWidget'
import type { NavKey } from '@/components/Sidebar'
import { useAreas } from '@/hooks/useAreas'
import { useHotkeys } from '@/hooks/useHotkeys'
import { isModalLocked } from '@/lib/modal-lock'
import { requestQuickAddFocus } from '@/lib/quick-add-focus'
import { useSessionCtx } from '@/session-context'
import { useSettingsCtx } from '@/settings-context'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import type { Area } from '@shared/types'
// import { Board } from '@/screens/Board' // ukryte na razie
import { EntryDetail } from '@/screens/EntryDetail'
import { Offers } from '@/screens/Offers'
// import { Profile } from '@/screens/Profile' // ukryte na razie
import { Settings } from '@/screens/Settings'
import { Stats } from '@/screens/Stats'
import { Tasks } from '@/screens/Tasks'

export function App() {
  const { t } = useT()
  const [screen, setScreen] = useState<NavKey>('tasks')
  const [taskArea, setTaskArea] = useState<{ id: number; name: string } | null>(null)
  const [openEntryId, setOpenEntryId] = useState<number | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [addAreaOpen, setAddAreaOpen] = useState(false)
  const [taskRefresh, setTaskRefresh] = useState(0)
  const { areas, reload: reloadAreas } = useAreas()
  const { shortcuts } = useSettingsCtx()
  const session = useSessionCtx()
  const sessionVisible = session.active != null || session.paused != null

  const createArea = async (name: string, color: string) => {
    await api.areas.create(name, color)
    reloadAreas()
  }

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
  const dropTaskToArea = async (area: Area, taskId: number) => {
    // Przeciągnięcie karty zadania na obszar → zmiana obszaru (reużywa api.entries.update).
    try {
      await api.entries.update(taskId, { areaId: area.id })
      setTaskRefresh((n) => n + 1)
      void session.refresh() // kolor obszaru w widżecie sesji
    } catch {
      // Nieudany zapis (np. wyścig) — nie zostawiamy połowicznie zmienionego UI.
    }
  }
  const focusAdd = () => {
    setOpenEntryId(null)
    setTaskArea(null)
    setScreen('tasks')
    requestQuickAddFocus()
  }

  useHotkeys({
    [shortcuts['screen.tasks']]: () => navigate('tasks'),
    [shortcuts['screen.offers']]: () => navigate('offers'),
    [shortcuts['screen.stats']]: () => navigate('stats'),
    [shortcuts.quickAdd]: focusAdd,
    [shortcuts.addArea]: () => setAddAreaOpen(true),
    [shortcuts.session]: () => void session.toggle(), // sesja działa z każdego ekranu
    'ctrl+arrowup': focusAdd
  })

  // Ctrl+K przychodzi z procesu głównego (before-input-event) — pewne w Electronie; pod modalem nieaktywny.
  useEffect(
    () =>
      api.system.onPaletteToggle(() => {
        if (!isModalLocked()) setPaletteOpen((o) => !o)
      }),
    []
  )

  const NAV_ICON: Record<NavKey, string> = {
    tasks: 'check-square',
    inbox: 'tray',
    board: 'columns',
    offers: 'briefcase',
    stats: 'chart-bar',
    profile: 'user',
    settings: 'gear'
  }
  const paletteActions: PaletteAction[] = [
    ...(['tasks', 'offers', 'stats', 'settings'] as NavKey[]).map((k) => ({
      id: `go.${k}`,
      icon: NAV_ICON[k],
      label: t(`nav.${k}` as StringKey),
      run: () => navigate(k)
    })),
    { id: 'add', icon: 'plus', label: t('pal.addTask'), run: focusAdd },
    { id: 'addArea', icon: 'plus', label: t('pal.addArea'), run: () => setAddAreaOpen(true) },
    { id: 'session.start', icon: 'timer', label: t('pal.startSession'), run: () => void session.start(null) },
    { id: 'session.stop', icon: 'pause', label: t('pal.stopSession'), run: () => void session.stop() }
  ]

  const content =
    openEntryId !== null ? (
      <EntryDetail key={openEntryId} id={openEntryId} onClose={() => setOpenEntryId(null)} onOpen={setOpenEntryId} />
    ) : screen === 'tasks' ? (
      <Tasks
        areaFilter={taskArea}
        onClearArea={() => setTaskArea(null)}
        onOpenEntry={setOpenEntryId}
        refreshToken={taskRefresh}
      />
    ) : screen === 'offers' ? (
      <Offers onOpenEntry={setOpenEntryId} />
    ) : screen === 'stats' ? (
      <Stats />
    ) : screen === 'settings' ? (
      <Settings />
    ) : (
      <Placeholder screen={screen} />
    )

  return (
    <>
      <AppShell
        current={screen}
        onNavigate={navigate}
        areas={areas}
        activeAreaId={screen === 'tasks' && openEntryId === null ? taskArea?.id ?? null : null}
        onAreaSelect={selectArea}
        onAddArea={() => setAddAreaOpen(true)}
        onAreaDrop={dropTaskToArea}
        onOpenPalette={() => setPaletteOpen(true)}
        dock={sessionVisible}
      >
        {content}
        {sessionVisible && (
          <SessionWidget
            active={session.active}
            paused={session.paused}
            onStop={() => void session.stop()}
            onPause={() => void session.pause()}
            onResume={() => void session.resume()}
            onSwitch={(id) => void session.switchTo(id)}
          />
        )}
      </AppShell>
      {paletteOpen && (
        <CommandPalette
          actions={paletteActions}
          onClose={() => setPaletteOpen(false)}
          onOpenEntry={setOpenEntryId}
        />
      )}
      {addAreaOpen && <AreaPopover onCreate={createArea} onClose={() => setAddAreaOpen(false)} />}
    </>
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
