import { useEffect, useRef, useState } from 'react'
import { api } from '@/api'
import { Icon } from '@/components/Icon'
import { SegmentedControl } from '@/components/SegmentedControl'
import { SettingsRow } from '@/components/SettingsRow'
import { SettingsSection } from '@/components/SettingsSection'
import { SettingsSubNav } from '@/components/SettingsSubNav'
import { ShortcutRow } from '@/components/ShortcutRow'
import { Stepper } from '@/components/Stepper'
import { Toggle } from '@/components/Toggle'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import { useSettingsCtx } from '@/settings-context'
import { SHORTCUT_ACTIONS, type ShortcutAction } from '@shared/shortcuts'

const ACCENTS = [
  { key: 'mono', color: 'oklch(0.72 0 0)' },
  { key: 'blue', color: 'oklch(0.62 0.13 240)' },
  { key: 'violet', color: 'oklch(0.62 0.13 288)' },
  { key: 'green', color: 'oklch(0.64 0.13 152)' },
  { key: 'amber', color: 'oklch(0.74 0.13 70)' },
  { key: 'red', color: 'oklch(0.62 0.16 24)' }
]

const SCREEN_NAV: Record<string, StringKey> = {
  'screen.tasks': 'nav.tasks',
  'screen.inbox': 'nav.inbox',
  'screen.board': 'nav.board',
  'screen.offers': 'nav.offers',
  'screen.stats': 'nav.stats'
}

export function Settings() {
  const { t } = useT()
  const { settings, set, shortcuts } = useSettingsCtx()
  const [current, setCurrent] = useState('appearance')
  const [dbPath, setDbPath] = useState('')

  const refs = {
    appearance: useRef<HTMLElement>(null),
    sessions: useRef<HTMLElement>(null),
    data: useRef<HTMLElement>(null),
    shortcuts: useRef<HTMLElement>(null),
    account: useRef<HTMLElement>(null)
  }

  useEffect(() => {
    void api.system.dbPath().then(setDbPath)
  }, [])

  const go = (key: string) => {
    setCurrent(key)
    refs[key as keyof typeof refs].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const shortcutLabel = (action: ShortcutAction): string => {
    if (action === 'quickAdd') return t('sc.quickAdd')
    if (action === 'addArea') return t('pal.addArea')
    if (action === 'session') return t('sc.session')
    return `${t('sc.goto')} ${t(SCREEN_NAV[action])}`
  }
  const recordShortcut = (action: ShortcutAction, combo: string) =>
    set('shortcuts', { ...settings.shortcuts, [action]: combo })
  const resetShortcut = (action: ShortcutAction) => {
    const next = { ...settings.shortcuts }
    delete next[action]
    set('shortcuts', next)
  }

  const subnav = [
    { key: 'appearance', label: t('set.appearance') },
    { key: 'sessions', label: t('set.sessions') },
    { key: 'data', label: t('set.data') },
    { key: 'shortcuts', label: t('set.shortcuts') },
    { key: 'account', label: t('set.account') }
  ]

  return (
    <div className="settings">
      <SettingsSubNav items={subnav} current={current} onSelect={go} />

      <div className="settings__panel">
        <div className="settings__inner">
          <SettingsSection ref={refs.appearance} title={t('set.appearance')} hint={t('set.appearance.hint')}>
            <SettingsRow title={t('set.language')} desc={t('set.language.desc')}>
              <SegmentedControl
                value={settings.language}
                onChange={(v) => set('language', v)}
                options={[
                  { key: 'pl', label: 'PL' },
                  { key: 'en', label: 'EN' }
                ]}
              />
            </SettingsRow>
            <SettingsRow title={t('set.theme')} desc={t('set.theme.desc')}>
              <SegmentedControl
                value={settings.theme}
                onChange={(v) => set('theme', v)}
                options={[
                  { key: 'dark', label: t('theme.dark') },
                  { key: 'light', label: t('theme.light') },
                  { key: 'system', label: t('theme.system') }
                ]}
              />
            </SettingsRow>
            <SettingsRow title={t('set.accent')} desc={t('set.accent.desc')}>
              <div className="accentdots">
                {ACCENTS.map((a) => (
                  <button
                    key={a.key}
                    className={`accentdot${settings.accent === a.key ? ' accentdot--active' : ''}`}
                    style={{ background: a.color }}
                    aria-label={a.key}
                    onClick={() => set('accent', a.key)}
                  />
                ))}
              </div>
            </SettingsRow>
            <SettingsRow title={t('set.font')} desc={t('set.font.desc')}>
              <SegmentedControl
                value={settings.font}
                onChange={(v) => set('font', v)}
                options={[
                  { key: 'inter', label: t('font.inter') },
                  { key: 'system', label: t('font.system') },
                  { key: 'mono', label: t('font.mono') }
                ]}
              />
            </SettingsRow>
            <SettingsRow title={t('set.density')} desc={t('set.density.desc')}>
              <SegmentedControl
                value={settings.density}
                onChange={(v) => set('density', v)}
                options={[
                  { key: 'compact', label: t('density.compact') },
                  { key: 'comfortable', label: t('density.comfortable') }
                ]}
              />
            </SettingsRow>
            <SettingsRow title={t('set.mono')} desc={t('set.mono.desc')} last>
              <Toggle checked={settings.monoNumbers} onChange={(v) => set('monoNumbers', v)} />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection ref={refs.sessions} title={t('set.sessions')} hint={t('set.sessions.hint')}>
            <SettingsRow title={t('set.streak')} desc={t('set.streak.desc')}>
              <Stepper
                value={settings.streakThresholdMinutes}
                onChange={(v) => set('streakThresholdMinutes', v)}
                min={5}
                max={240}
                step={5}
                unit={t('unit.min')}
              />
            </SettingsRow>
            <SettingsRow title={t('set.sessionLen')} desc={t('set.sessionLen.desc')}>
              <Stepper
                value={settings.defaultSessionMinutes}
                onChange={(v) => set('defaultSessionMinutes', v)}
                min={5}
                max={240}
                step={5}
                unit={t('unit.min')}
              />
            </SettingsRow>
            <SettingsRow title={t('set.autoPause')} desc={t('set.autoPause.desc')}>
              <Toggle checked={settings.autoPause} onChange={(v) => set('autoPause', v)} />
            </SettingsRow>
            <SettingsRow title={t('set.askUnclosed')} desc={t('set.askUnclosed.desc')}>
              <Toggle checked={settings.askUnclosedSession} onChange={(v) => set('askUnclosedSession', v)} />
            </SettingsRow>
            <SettingsRow title={t('set.activeWindow')} desc={t('set.activeWindow.desc')} last>
              <Toggle
                checked={settings.countActiveWindowOnly}
                onChange={(v) => set('countActiveWindowOnly', v)}
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection ref={refs.data} title={t('set.data')} hint={t('set.data.hint')}>
            <SettingsRow title={t('set.dbLocation')} desc={dbPath}>
              <button className="btn btn--outline" onClick={() => api.system.openDbFolder()}>
                <Icon name="folder-open" size={14} />
                {t('set.openFolder')}
              </button>
            </SettingsRow>
            <SettingsRow title={t('set.backup')} desc={t('set.backup.desc')}>
              <Toggle checked={settings.backup} onChange={(v) => set('backup', v)} />
            </SettingsRow>
            <SettingsRow title={t('set.export')} desc={t('set.export.desc')} last>
              <div className="setrow__btns">
                <button className="btn btn--outline">CSV</button>
                <button className="btn btn--outline">JSON</button>
              </div>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection ref={refs.shortcuts} title={t('set.shortcuts')} hint={t('set.shortcuts.hint')}>
            <div className="sclist">
              {SHORTCUT_ACTIONS.map((action) => (
                <ShortcutRow
                  key={action}
                  label={shortcutLabel(action)}
                  combo={shortcuts[action]}
                  custom={settings.shortcuts[action] !== undefined}
                  onRecord={(c) => recordShortcut(action, c)}
                  onReset={() => resetShortcut(action)}
                />
              ))}
            </div>
          </SettingsSection>

          <SettingsSection ref={refs.account} title={t('set.account')} hint={t('set.account.hint')}>
            <p className="setaccount">{t('set.account.body')}</p>
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}
