import type { ReactNode } from 'react'

interface Props {
  title: string
  desc?: string
  children: ReactNode
  last?: boolean
}

export function SettingsRow({ title, desc, children, last }: Props) {
  return (
    <div className={`setrow${last ? ' setrow--last' : ''}`}>
      <div className="setrow__text">
        <span className="setrow__title">{title}</span>
        {desc && <span className="setrow__desc">{desc}</span>}
      </div>
      <div className="setrow__control">{children}</div>
    </div>
  )
}
