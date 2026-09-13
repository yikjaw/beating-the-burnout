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
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-4 py-4">
      <p className="text-sm text-[var(--color-ink)]">{nudge.message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleAccept}
          className="min-h-11 flex-1 rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-white"
        >
          Add to schedule
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="min-h-11 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm font-medium text-[var(--color-ink)]"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
