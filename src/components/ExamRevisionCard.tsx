import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { revisionTitle } from '../lib/examRevision'
import type { RevisionSuggestion } from '../lib/examRevision'
import { formatHourLabel } from '../lib/scheduleGrid'

export function ExamRevisionCard({ suggestion }: { suggestion: RevisionSuggestion }) {
  const { addCommitment } = useAppData()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleAccept() {
    const dueHour = suggestion.slot.startHour + suggestion.hours
    const due = new Date()
    due.setHours(Math.floor(dueHour), Math.round((dueHour % 1) * 60), 0, 0)

    await addCommitment({
      title: revisionTitle(suggestion.exam.title),
      category: 'mental',
      effort_hours: suggestion.hours,
      due_at: due.toISOString(),
      priority: 2,
      is_flexible: true,
    })
    setDismissed(true)
  }

  return (
    <div className="card-tinted flex flex-col gap-3 px-4 py-4">
      <p className="text-sm text-[var(--color-ink)]">
        {formatHourLabel(suggestion.slot.startHour)}–{formatHourLabel(suggestion.slot.endHour)} is free today —{' '}
        put in {suggestion.hours}h revising for <span className="font-medium">{suggestion.exam.title}</span>?
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={handleAccept} className="btn-primary flex-1 text-sm">
          Schedule it
        </button>
        <button type="button" onClick={() => setDismissed(true)} className="btn-secondary flex-1 text-sm">
          Not now
        </button>
      </div>
    </div>
  )
}
