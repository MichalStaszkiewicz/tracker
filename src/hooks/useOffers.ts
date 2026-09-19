import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api'
import type { OfferRow } from '@shared/types'

export function useOffers() {
  const [offers, setOffers] = useState<OfferRow[]>([])
  const refetch = useCallback(async () => {
    setOffers(await api.offers.list())
  }, [])
  useEffect(() => {
    void refetch()
  }, [refetch])
  return { offers, refetch }
}
