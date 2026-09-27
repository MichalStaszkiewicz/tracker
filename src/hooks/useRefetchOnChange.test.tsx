// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRefetchOnChange } from './useRefetchOnChange'

afterEach(cleanup)

describe('useRefetchOnChange', () => {
  it('nie odświeża przy montowaniu; odświeża raz na każdą zmianę klucza', () => {
    const refetch = vi.fn()
    const { rerender } = renderHook(({ k }) => useRefetchOnChange(k, refetch), { initialProps: { k: '5:42' as string | null } })
    expect(refetch).not.toHaveBeenCalled()
    rerender({ k: '5:42' })
    expect(refetch).not.toHaveBeenCalled()
    rerender({ k: null }) // pauza / stop
    expect(refetch).toHaveBeenCalledTimes(1)
    rerender({ k: '6:7' }) // przełączenie
    expect(refetch).toHaveBeenCalledTimes(2)
  })

  it('regresja: przypięcie zadania do tego samego odcinka (ten sam id) też odświeża', () => {
    const refetch = vi.fn()
    const { rerender } = renderHook(({ k }) => useRefetchOnChange(k, refetch), { initialProps: { k: '5:' } })
    rerender({ k: '5:7' })
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
