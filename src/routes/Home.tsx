import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CapacityRing } from '../components/CapacityRing'
import { FreeTimeCard } from '../components/FreeTimeCard'
import { RecoveryNudgeCard } from '../components/RecoveryNudgeCard'
import { useAppData } from '../context/AppDataContext'
import { CATEGORY_LABEL } from '../lib/categoryMeta'
import { computeFreeSlots, recommendActivity } from '../lib/freeTime'
import { computeRecoveryNudge } from '../lib/recoveryNudge'
import { categoryLoad, overallCapacity } from '../lib/scoring'
import { CATEGORIES } from '../lib/types'

const RECENT_CHECKIN_WINDOW = 3
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function Home() {
  const { capacities, commitments, checkins, wearableMetrics, preferences } = useAppData()

  const loads = categoryLoad(commitments, capacities)
  const recent = checkins.slice(-RECENT_CHECKIN_WINDOW)
  const { percentage, flaggedCategories } = overallCapacity(loads, recent)

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const todayWearable = wearableMetrics.find((m) => m.logged_on === today) ?? null
  const recoveryNudge = computeRecoveryNudge(commitments, loads, checkins, todayWearable, wearableMetrics)

  // Only surface one card at a time — the recovery nudge (something's
  // actually off) takes priority over a nice-to-have free-time suggestion.
  const freeTimeSuggestion = useMemo(() => {
    if (recoveryNudge || !preferences) return null
    const slots = computeFreeSlots(commitments, preferences.wakeTime, preferences.bedtime, now)
    return recommendActivity(slots, preferences.activities, now.getDate())
  }, [recoveryNudge, preferences, commitments, now])

  const displayPercentage = Math.round(percentage * 100)
  const overloaded = percentage > 1.0

  // "This week" means due by end of the week (or overdue, or no deadline at
  // all) — not just "still open", which could include things due next month.
  const { thisWeekCommitments, laterCount } = useMemo(() => {
    const now = Date.now()
    const weekFromNow = now + WEEK_MS
    const open = commitments.filter((c) => c.status === 'open')
    const thisWeek = open.filter((c) => !c.due_at || new Date(c.due_at).getTime() <= weekFromNow)
    return { thisWeekCommitments: thisWeek, laterCount: open.length - thisWeek.length }
  }, [commitments])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-1 pt-4 text-center">
        <span className="text-sm text-[var(--color-ink-soft)]">Your week, right now</span>
        <span
          className={`text-6xl font-bold tabular-nums ${overloaded ? 'text-[var(--color-flag)]' : 'text-[var(--color-accent-strong)]'}`}
        >
          {displayPercentage}%
        </span>
        <span className="text-sm text-[var(--color-ink-soft)]">
          {overloaded ? "That's more than you've got room for." : "You're within your capacity."}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {CATEGORIES.map((category) => (
          <CapacityRing key={category} category={category} load={loads[category]} />
        ))}
      </div>

      {recoveryNudge && <RecoveryNudgeCard nudge={recoveryNudge} />}
      {freeTimeSuggestion && <FreeTimeCard suggestion={freeTimeSuggestion} />}

      {flaggedCategories.length > 0 && (
        <div className="rounded-xl border border-[var(--color-flag-soft)] bg-[var(--color-flag-soft)] px-4 py-3 text-sm text-[var(--color-ink)]">
          Running hot on: {flaggedCategories.map((c) => CATEGORY_LABEL[c]).join(', ')}.
        </div>
      )}

      {overloaded ? (
        <Link
          to="/balancer"
          className="rounded-xl bg-[var(--color-accent)] px-6 py-4 text-center text-base font-semibold text-white"
        >
          See what to move
        </Link>
      ) : (
        <Link
          to="/add"
          className="rounded-xl bg-[var(--color-accent)] px-6 py-4 text-center text-base font-semibold text-white"
        >
          Add something
        </Link>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-ink-soft)]">This week</h2>
        {thisWeekCommitments.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-soft)]">Nothing on your plate yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {thisWeekCommitments.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 text-sm"
              >
                <span>{c.title}</span>
                <span className="text-[var(--color-ink-soft)]">{CATEGORY_LABEL[c.category]}</span>
              </li>
            ))}
          </ul>
        )}
        {laterCount > 0 && (
          <Link to="/schedule" className="text-xs text-[var(--color-ink-soft)] underline underline-offset-2">
            +{laterCount} more later — see Schedule
          </Link>
        )}
      </div>
    </div>
  )
}
