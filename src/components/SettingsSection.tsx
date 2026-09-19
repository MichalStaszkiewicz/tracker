import { forwardRef, type ReactNode } from 'react'

interface Props {
  title: string
  hint?: string
  children: ReactNode
}

export const SettingsSection = forwardRef<HTMLElement, Props>(function SettingsSection(
  { title, hint, children },
  ref
) {
  return (
    <section className="setsection" ref={ref}>
      <div className="setsection__head">
        <h2 className="setsection__title">{title}</h2>
        {hint && <span className="setsection__hint">{hint}</span>}
      </div>
      {children}
    </section>
  )
})
