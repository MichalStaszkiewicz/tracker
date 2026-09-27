import { createContext, useContext, type ReactNode } from 'react'
import { useSession, type SessionApi } from '@/hooks/useSession'

const SessionCtx = createContext<SessionApi | null>(null)

/** Globalny stan sesji: widżet na każdym ekranie, start/stop z dowolnego miejsca. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSession()
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSessionCtx(): SessionApi {
  const ctx = useContext(SessionCtx)
  if (!ctx) throw new Error('useSessionCtx poza SessionProvider')
  return ctx
}
