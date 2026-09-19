interface Option<T extends string> {
  key: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ value, options, onChange }: Props<T>) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.key}
          className={`segmented__opt${o.key === value ? ' segmented__opt--active' : ''}`}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
