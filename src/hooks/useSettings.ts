import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api'
import { DEFAULT_SETTINGS, mergeSettings, type AppSettings } from '@shared/settings'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void api.settings.getAll().then((raw) => {
      setSettings(mergeSettings(raw))
      setLoaded(true)
    })
  }, [])

  const set = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }))
    await api.settings.set(key, value)
  }, [])

  return { settings, set, loaded }
}
