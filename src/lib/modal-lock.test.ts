import { describe, expect, it } from 'vitest'
import { acquireModalLock, isModalLocked } from './modal-lock'

describe('modal-lock', () => {
  it('licznik: dwa modale, zwolnienie idempotentne, nie schodzi poniżej zera', () => {
    expect(isModalLocked()).toBe(false)
    const a = acquireModalLock()
    const b = acquireModalLock()
    a()
    a() // drugie zwolnienie tego samego nic nie robi
    expect(isModalLocked()).toBe(true)
    b()
    expect(isModalLocked()).toBe(false)
    b()
    expect(isModalLocked()).toBe(false)
    const c = acquireModalLock()
    expect(isModalLocked()).toBe(true)
    c()
  })
})
