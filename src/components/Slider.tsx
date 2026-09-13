interface SliderProps {
  id: string
  label: string
  description?: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

export function Slider({ id, label, description, value, min, max, step = 1, unit = '', onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="font-medium text-[var(--color-ink)]">
          {label}
        </label>
        <span className="text-lg font-semibold text-[var(--color-accent-strong)]" aria-hidden="true">
          {value}
          {unit}
        </span>
      </div>
      {description ? <p className="text-sm text-[var(--color-ink-soft)]">{description}</p> : null}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
        aria-valuetext={`${value}${unit}`}
      />
    </div>
  )
}
