import { useEffect, useRef } from 'react'

/**
 * Woła `refetch` przy każdej zmianie `key` (nie przy montowaniu — wtedy dane i tak są świeże).
 * Np. lista zadań po zmianie sesji: znacznik trwającej sesji na kartach pochodzi z listy.
 */
export function useRefetchOnChange(key: string | number | null, refetch: () => unknown): void {
  const last = useRef(key)
  useEffect(() => {
    if (last.current === key) return
    last.current = key
    void refetch()
  }, [key, refetch])
}
