// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { addDaysKey, parseDateWord, toDateKey } from '@shared/dates'
import { DatePicker } from './DatePicker'

afterEach(cleanup)

const today = toDateKey(new Date())
const tomorrow = addDaysKey(today, 1)

const mount = (value: string | null, onChange = vi.fn()) => {
  render(
    <I18nProvider>
      <DatePicker value={value} onChange={onChange} ariaLabel="Data zadania" />
    </I18nProvider>
  )
  return onChange
}

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Data zadania' }))

describe('DatePicker', () => {
  it('bez wartości pokazuje „Bez daty"; wartość dziś → „Dziś"', () => {
    mount(null)
    expect(screen.getByText('Bez daty')).toBeTruthy()
    cleanup()
    mount(today)
    expect(screen.getByText('Dziś')).toBeTruthy()
  })

  it('szybka opcja „Jutro" ustawia jutrzejszą datę', () => {
    const onChange = mount(null)
    open()
    expect(screen.queryByText('Usuń datę')).toBeNull() // nie ma czego czyścić
    fireEvent.click(screen.getByText('Jutro'))
    expect(onChange).toHaveBeenCalledWith(tomorrow)
  })

  it('pole tekstowe: ta sama gramatyka co „@", podgląd i Enter', () => {
    const onChange = mount(null)
    open()
    const input = screen.getByPlaceholderText('np. jutro, pt, 25.09, +3')
    fireEvent.change(input, { target: { value: '25.09' } })
    expect(screen.getByText(/→ .*25\.09/)).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(parseDateWord('25.09'))
  })

  it('nierozpoznany tekst: komunikat i brak zmiany po Enter', () => {
    const onChange = mount(null)
    open()
    const input = screen.getByPlaceholderText('np. jutro, pt, 25.09, +3')
    fireEvent.change(input, { target: { value: 'kiedyś' } })
    expect(screen.getByText('nie rozpoznano')).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('„Usuń datę" czyści wartość', () => {
    const onChange = mount(tomorrow)
    open()
    fireEvent.click(screen.getByText('Usuń datę'))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
