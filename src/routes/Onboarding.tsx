import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Slider } from '../components/Slider'
import { useAppData } from '../context/AppDataContext'
import { CATEGORY_PROMPT } from '../lib/categoryMeta'
import { CATEGORIES, type CapacityMap } from '../lib/types'

const DEFAULT_HOURS = 10

export function Onboarding() {
  const { setCapacities } = useAppData()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<CapacityMap>({
    mental: DEFAULT_HOURS,
    time: DEFAULT_HOURS,
    physical: DEFAULT_HOURS,
    social: DEFAULT_HOURS,
    errands: DEFAULT_HOURS,
  })

  async function handleFinish() {
    await setCapacities(draft)
    navigate('/')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">How much room do you have?</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          For each area, how many hours a week do you realistically have — not what you wish, what's actually true.
          Takes under a minute.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {CATEGORIES.map((category) => (
          <Slider
            key={category}
            id={`capacity-${category}`}
            label={CATEGORY_PROMPT[category]}
            value={draft[category]}
            min={0}
            max={40}
            unit="h"
            onChange={(value) => setDraft((prev) => ({ ...prev, [category]: value }))}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleFinish}
        className="mt-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-base font-semibold text-white"
      >
        I'm done
      </button>
    </div>
  )
}
