// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isModalLocked } from '@/lib/modal-lock'
import { ModalShell } from './ModalShell'

afterEach(cleanup)

const mount = (onClose?: () => void) =>
  render(
    <ModalShell icon="note" title="Tytuł" badge="plik.sqlite" onClose={onClose} closeLabel="Zamknij" footer={<button>OK</button>}>
      <p>treść</p>
    </ModalShell>
  )

describe('ModalShell', () => {
  it('dialog z tytułem, odznaką, treścią i stopką', () => {
    mount(vi.fn())
    expect(screen.getByRole('dialog', { name: 'Tytuł' })).toBeTruthy()
    expect(screen.getByText('plik.sqlite')).toBeTruthy()
    expect(screen.getByText('treść')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'OK' })).toBeTruthy()
  })

  it('Esc, tło i × wołają onClose; klik w okno nie zamyka', () => {
    const onClose = vi.fn()
    const { container } = mount(onClose)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.mouseDown(container.querySelector('.palette__backdrop')!)
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }))
    expect(onClose).toHaveBeenCalledTimes(3)
    fireEvent.mouseDown(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('bez onClose — Esc i tło nic nie robią, brak ×', () => {
    const { container } = mount(undefined)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.mouseDown(container.querySelector('.palette__backdrop')!)
    expect(screen.queryByRole('button', { name: 'Zamknij' })).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('trzyma modal-lock tylko gdy zamontowany', () => {
    expect(isModalLocked()).toBe(false)
    const view = mount(vi.fn())
    expect(isModalLocked()).toBe(true)
    view.unmount()
    expect(isModalLocked()).toBe(false)
  })
})
