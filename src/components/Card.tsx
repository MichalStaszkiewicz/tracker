import type { ReactNode } from 'react'

interface Props {
  label?: string
  children: ReactNode
}

/** Płaska powierzchnia z opcjonalną etykietą (mono). */
export function Card({ label, children }: Props) {
  return (
    <div className="panelcard">
      {label && <div className="panelcard__label">{label}</div>}
      {children}
    </div>
  )
}
