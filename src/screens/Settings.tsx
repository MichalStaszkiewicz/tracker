import { useEffect, useRef, useState } from 'react'
import { api } from '@/api'
import { Icon } from '@/components/Icon'
import { SegmentedControl } from '@/components/SegmentedControl'
import { SettingsRow } from '@/components/SettingsRow'
import { SettingsSection } from '@/components/SettingsSection'
import { SettingsSubNav } from '@/components/SettingsSubNav'
import { Stepper } from '@/components/Stepper'
import { Toggle } from '@/components/Toggle'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'
import type { AppSettings } from '@shared/settings'

const ACCENTS = [
  { key: 'mono', color: 'oklch(0.95 0 0)' },
  { key: 'red', color: 'oklch(0.66 0.16 24)' },
  { key: 'blurple', color: '#9184d9' },
  { key: 'amber', color: 'oklch(0.80 0.13 85)' }
]

const SHORTCUTS: { label: StringKey; combo: string }[] = [
  { label: 'sc.quickAdd', combo: 'Ctrl ⇧ Space' },
  { label: 'sc.palette', combo: 'Ctrl K' },
  { label: 'sc.session', combo: 'Ctrl T' },
  { label: 'sc.screens', combo: 'Ctrl 1…5' },
  { label: 'sc.check', combo: 'Space' },
  { label: 'sc.undo', combo: 'Ctrl Z' }
]

interface Props {
  settings: AppSettings
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export function Settings({ settings, set }: Props) {
  const { t } = useT()
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
              {SHORTCUTS.map((s) => (
                <div className="scrow" key={s.label}>
                  <span className="scrow__label">{t(s.label)}</span>
                  <span className="scrow__combo">{s.combo}</span>
                </div>
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
