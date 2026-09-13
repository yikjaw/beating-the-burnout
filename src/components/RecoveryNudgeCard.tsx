import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import type { RecoveryNudge } from '../lib/recoveryNudge'

export function RecoveryNudgeCard({ nudge }: { nudge: RecoveryNudge }) {
  const { addCommitment, logRecoverySuggestion } = useAppData()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleAccept() {
    await addCommitment({
      title: nudge.title,
      category: nudge.category,
      effort_hours: nudge.effortHours,
      due_at: nudge.dueAt,
      priority: 2,
      is_flexible: false,
    })
    await logRecoverySuggestion({ reason: nudge.reason, category: nudge.category }, true)
    setDismissed(true)
  }

  async function handleDismiss() {
    await logRecoverySuggestion({ reason: nudge.reason, category: nudge.category }, false)
    setDismissed(true)
  }

  return (
    <div className="card-tinted flex flex-col gap-3 px-4 py-4">
      <p className="text-sm text-[var(--color-ink)]">{nudge.message}</p>
      <div className="flex gap-3">
        <button type="button" onClick={handleAccept} className="btn-primary flex-1 text-sm">
          Add to schedule
        </button>
        <button type="button" onClick={handleDismiss} className="btn-secondary flex-1 text-sm">
          Not now
        </button>
      </div>
    </div>
  )
}
