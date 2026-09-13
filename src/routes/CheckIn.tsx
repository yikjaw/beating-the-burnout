import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'

const SCALE = [1, 2, 3, 4, 5]

function PickerRow({
  label,
  value,
  onSelect,
  lowLabel,
  highLabel,
}: {
  label: string
  value: number | null
  onSelect: (v: number) => void
  lowLabel: string
  highLabel: string
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-medium">{label}</legend>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {SCALE.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onSelect(n)}
            className="chip h-12 text-base"
            data-active={value === n}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-[var(--color-ink-soft)]">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </fieldset>
  )
}

export function CheckIn() {
  const { addCheckIn } = useAppData()
  const navigate = useNavigate()

  const [energy, setEnergy] = useState<number | null>(null)
  const [stress, setStress] = useState<number | null>(null)
  const [sleptWell, setSleptWell] = useState<boolean | null>(null)

  const canSubmit = energy !== null && stress !== null && sleptWell !== null

  async function handleSubmit() {
    if (!canSubmit) return
    await addCheckIn({ energy, stress, slept_well: sleptWell })
    navigate('/')
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">How's today going?</h1>

      <PickerRow label="Energy" value={energy} onSelect={setEnergy} lowLabel="Running on empty" highLabel="Great" />
      <PickerRow label="Stress" value={stress} onSelect={setStress} lowLabel="Calm" highLabel="Overwhelmed" />

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium">Sleep okay last night?</legend>
        <div className="flex gap-3">
          <button type="button" onClick={() => setSleptWell(true)} className="chip py-3 text-base" data-active={sleptWell === true}>
            Yes
          </button>
          <button type="button" onClick={() => setSleptWell(false)} className="chip py-3 text-base" data-active={sleptWell === false}>
            No
          </button>
        </div>
      </fieldset>

      <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="btn-primary py-4">
        Done
      </button>
    </div>
  )
}
