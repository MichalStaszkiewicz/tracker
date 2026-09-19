import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { useT } from '@/i18n'
import type { AppSettings } from '@shared/settings'
import { resolveShortcuts, type ShortcutAction } from '@shared/shortcuts'

interface Ctx {
  settings: AppSettings
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  shortcuts: Record<ShortcutAction, string>
  loaded: boolean
}

const SettingsCtx = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { settings, set, loaded } = useSettings()
  const { setLang } = useT()

  // Język na żywo.
  useEffect(() => setLang(settings.language), [settings.language, setLang])

  // Motyw / akcent / czcionka / gęstość jako atrybuty na <html>.
  useEffect(() => {
    const r = document.documentElement
    r.dataset.theme = settings.theme
    r.dataset.accent = settings.accent
    r.dataset.font = settings.font
    r.dataset.density = settings.density
  }, [settings.theme, settings.accent, settings.font, settings.density])

  const shortcuts = useMemo(() => resolveShortcuts(settings.shortcuts), [settings.shortcuts])
  const value = useMemo<Ctx>(
    () => ({ settings, set, shortcuts, loaded }),
    [settings, set, shortcuts, loaded]
  )

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export function useSettingsCtx(): Ctx {
  const ctx = useContext(SettingsCtx)
  if (!ctx) throw new Error('useSettingsCtx poza SettingsProvider')
  return ctx
}
