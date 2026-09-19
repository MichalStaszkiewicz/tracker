import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { strings, type Lang, type StringKey } from './strings'

type Vars = Record<string, string | number>
type TFn = (key: StringKey, vars?: Vars) => string

interface I18nCtx {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TFn
}

const Ctx = createContext<I18nCtx | null>(null)

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? `{${k}}`))
}

export function I18nProvider({ children, initial = 'pl' }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLang] = useState<Lang>(initial)
  const t = useCallback<TFn>((key, vars) => interpolate(strings[lang][key], vars), [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useT(): I18nCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useT poza I18nProvider')
  return ctx
}
