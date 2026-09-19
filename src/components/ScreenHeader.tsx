import type { ReactNode } from 'react'

interface Props {
  eyebrow: string
  title: string
  actions?: ReactNode
}

export function ScreenHeader({ eyebrow, title, actions }: Props) {
  return (
    <div className="header">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span className="header__eyebrow">{eyebrow}</span>
        <h1 className="header__title">{title}</h1>
      </div>
      {actions && <div className="header__actions">{actions}</div>}
    </div>
  )
}
