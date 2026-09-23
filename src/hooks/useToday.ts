import { useEffect, useState } from 'react'
import { toDateKey } from '@shared/dates'

/**
 * Klucz dzisiejszej daty (YYYY-MM-DD), odświeżany o północy oraz po powrocie do okna
 * (uśpienie/wybudzenie komputera). Widoki zależne od „dziś" muszą go mieć w zależnościach,
 * inaczej po północy sekcja „Dziś" zapisywałaby wczorajszą datę.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => toDateKey(new Date()))

  useEffect(() => {
    const sync = () => setToday(toDateKey(new Date()))
    const now = new Date()
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = setTimeout(sync, nextMidnight.getTime() - now.getTime() + 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [today]) // po zmianie dnia uzbrój timer na kolejną północ

  return today
}
