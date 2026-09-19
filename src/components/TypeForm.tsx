import { useT } from '@/i18n'
import type { FieldDef } from '@shared/types'
import { Menu } from './Menu'
import { Toggle } from './Toggle'

interface Props {
  fields: FieldDef[]
  data: Record<string, unknown>
  onCommit: (key: string, value: unknown) => void
}

/** Renderuje formularz pól z definicji typu (ENTRY_TYPE.fields). Sześć typów pól. */
export function TypeForm({ fields, data, onCommit }: Props) {
  const { t } = useT()
  if (fields.length === 0) {
    return <p className="tf__empty">{t('detail.noFields')}</p>
  }
  return (
    <div className="tf">
      {fields.map((f) => (
        <Field key={f.key} field={f} value={data[f.key]} onCommit={(v) => onCommit(f.key, v)} />
      ))}
    </div>
  )
}

function Field({
  field,
  value,
  onCommit
}: {
  field: FieldDef
  value: unknown
  onCommit: (value: unknown) => void
}) {
  const label = <span className="tf__label">{field.label}</span>

  if (field.type === 'bool') {
    return (
      <label className="tf__row tf__row--inline">
        {label}
        <Toggle checked={value === true} onChange={(v) => onCommit(v)} />
      </label>
    )
  }

  if (field.type === 'select') {
    const current = typeof value === 'string' ? value : ''
    return (
      <div className="tf__row">
        {label}
        <Menu
          trigger={<span>{current || '—'}</span>}
          items={(field.options ?? []).map((o) => ({ key: o, label: o }))}
          activeKey={current}
          onSelect={(k) => onCommit(k)}
        />
      </div>
    )
  }

  const type = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
  const str = value == null ? '' : String(value)
  return (
    <label className="tf__row">
      {label}
      <input
        className={`pinput${field.type === 'url' || field.type === 'number' ? ' pinput--mono' : ''}`}
        type={type}
        defaultValue={str}
        onBlur={(e) => {
          const raw = e.currentTarget.value
          onCommit(field.type === 'number' ? (raw === '' ? null : Number(raw)) : raw)
        }}
      />
    </label>
  )
}
