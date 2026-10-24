import { useEffect, useRef } from 'react'
import { comboFromEvent } from '@/lib/hotkeys'
import { isModalLocked } from '@/lib/modal-lock'

/**
 * Rejestruje globalne skróty w oknie. Klucze mapy to combo, np. 'ctrl+t'.
 * Skróty z Ctrl/Cmd działają też podczas pisania w polach; pod otwartym modalem są wyłączone.
 */
export function useHotkeys(handlers: Record<string, () => void>) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isModalLocked()) return
      const handler = ref.current[comboFromEvent(e)]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
