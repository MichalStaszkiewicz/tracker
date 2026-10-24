import type { ReactNode } from 'react'

interface Props {
  title: string
  desc?: string
  /** 'error' — opis jest komunikatem błędu. */
  tone?: 'error'
  children: ReactNode
  last?: boolean
}

export function SettingsRow({ title, desc, tone, children, last }: Props) {
  return (
    <div className={`setrow${last ? ' setrow--last' : ''}`}>
      <div className="setrow__text">
        <span className="setrow__title">{title}</span>
        {desc && (
          // pełny tekst w podpowiedzi — długie ścieżki są ucinane wielokropkiem
          <span className={`setrow__desc${tone === 'error' ? ' setrow__desc--err' : ''}`} title={desc}>
            {desc}
          </span>
        )}
      </div>
      <div className="setrow__control">{children}</div>
    </div>
  )
}
