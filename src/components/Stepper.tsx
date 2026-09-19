interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 5, unit }: Props) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  return (
    <span className="stepper">
      <button className="stepper__btn" aria-label="mniej" onClick={() => onChange(clamp(value - step))}>
        −
      </button>
      <span className="stepper__val">
        {value}
        {unit && <span className="stepper__unit">{unit}</span>}
      </span>
      <button className="stepper__btn" aria-label="więcej" onClick={() => onChange(clamp(value + step))}>
        +
      </button>
    </span>
  )
}
