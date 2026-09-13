import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import type { ActivitySuggestion } from '../lib/freeTime'
import { formatHourLabel } from '../lib/scheduleGrid'

const MAX_EFFORT_HOURS = 2

export function FreeTimeCard({ suggestion }: { suggestion: ActivitySuggestion }) {
  const { addCommitment } = useAppData()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleAccept() {
    const slotDuration = suggestion.slot.endHour - suggestion.slot.startHour
    const effortHours = Math.round(Math.min(MAX_EFFORT_HOURS, slotDuration) * 4) / 4
    const dueHour = suggestion.slot.startHour + effortHours

    const due = new Date()
    due.setHours(Math.floor(dueHour), Math.round((dueHour % 1) * 60), 0, 0)

    await addCommitment({
      title: suggestion.activity,
      category: suggestion.category,
      effort_hours: effortHours,
      due_at: due.toISOString(),
      priority: 3,
      is_flexible: true,
    })
    setDismissed(true)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-4 py-4">
      <p className="text-sm text-[var(--color-ink)]">
        {formatHourLabel(suggestion.slot.startHour)}–{formatHourLabel(suggestion.slot.endHour)} is free today.{' '}
        {suggestion.isNovel && <span className="text-[var(--color-ink-soft)]">Something different — </span>}
        <span className="font-medium">{suggestion.activity}</span>?
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleAccept}
          className="min-h-11 flex-1 rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-white"
        >
          Schedule it
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="min-h-11 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm font-medium text-[var(--color-ink)]"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
