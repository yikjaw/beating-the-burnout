import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CapacityRing } from '../components/CapacityRing'
import { ExamRevisionCard } from '../components/ExamRevisionCard'
import { FreeTimeCard } from '../components/FreeTimeCard'
import { RecoveryNudgeCard } from '../components/RecoveryNudgeCard'
import { useAppData } from '../context/AppDataContext'
import { CATEGORY_LABEL } from '../lib/categoryMeta'
import { computeRevisionSuggestion } from '../lib/examRevision'
import { computeFreeSlots, recommendActivity } from '../lib/freeTime'
import { computeRecoveryNudge } from '../lib/recoveryNudge'
import { categoryLoad, overallCapacity } from '../lib/scoring'
import { CATEGORIES } from '../lib/types'

const RECENT_CHECKIN_WINDOW = 3
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function Home() {
  const { capacities, commitments, checkins, wearableMetrics, preferences, exams, completeCommitment } = useAppData()

  const loads = categoryLoad(commitments, capacities)
  const recent = checkins.slice(-RECENT_CHECKIN_WINDOW)
  const { percentage, flaggedCategories } = overallCapacity(loads, recent)

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const todayWearable = wearableMetrics.find((m) => m.logged_on === today) ?? null
  const recoveryNudge = computeRecoveryNudge(commitments, loads, checkins, todayWearable, wearableMetrics)

  // Only surface one card at a time, in priority order: something's
  // actually off (recovery nudge) > an unmet exam revision goal > a
  // nice-to-have free-time suggestion.
  const revisionSuggestion = useMemo(() => {
    if (recoveryNudge || !preferences || exams.length === 0) return null
    const slots = computeFreeSlots(commitments, preferences.wakeTime, preferences.bedtime, now)
    return computeRevisionSuggestion(exams, commitments, slots, now)
  }, [recoveryNudge, preferences, exams, commitments, now])

  const freeTimeSuggestion = useMemo(() => {
    if (recoveryNudge || revisionSuggestion || !preferences) return null
    const slots = computeFreeSlots(commitments, preferences.wakeTime, preferences.bedtime, now)
    return recommendActivity(slots, preferences.activities, now.getDate())
  }, [recoveryNudge, revisionSuggestion, preferences, commitments, now])

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
    <div className="flex flex-col gap-7">
      <div className="card relative overflow-hidden px-6 pb-7 pt-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full opacity-70"
          style={{
            background: `radial-gradient(circle, ${overloaded ? 'var(--color-flag-soft)' : 'var(--color-accent-soft)'} 0%, transparent 70%)`,
          }}
        />
        <div className="relative flex flex-col items-center gap-1 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
            Your week, right now
          </span>
          <span
            className={`text-7xl font-extrabold tabular-nums tracking-tight ${overloaded ? 'text-[var(--color-flag-text)]' : 'text-[var(--color-accent-strong)]'}`}
          >
            {displayPercentage}%
          </span>
          <span className="text-sm text-[var(--color-ink-soft)]">
            {overloaded ? "That's more than you've got room for." : "You're within your capacity."}
          </span>
        </div>

        <div className="relative mt-6 grid grid-cols-5 gap-1">
          {CATEGORIES.map((category) => (
            <CapacityRing key={category} category={category} load={loads[category]} />
          ))}
        </div>
      </div>

      {recoveryNudge && <RecoveryNudgeCard nudge={recoveryNudge} />}
      {revisionSuggestion && <ExamRevisionCard suggestion={revisionSuggestion} />}
      {freeTimeSuggestion && <FreeTimeCard suggestion={freeTimeSuggestion} />}

      {flaggedCategories.length > 0 && (
        <div className="rounded-xl border border-[var(--color-flag-soft)] bg-[var(--color-flag-soft)] px-4 py-3 text-sm text-[var(--color-ink)]">
          Running hot on: {flaggedCategories.map((c) => CATEGORY_LABEL[c]).join(', ')}.
        </div>
      )}

      {overloaded ? (
        <Link to="/balancer" className="btn-primary">
          See what to move
        </Link>
      ) : (
        <Link to="/add" className="btn-primary">
          Add something
        </Link>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-ink-soft)]">This week</h2>
        {thisWeekCommitments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-ink-soft)]">
            Nothing on your plate yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {thisWeekCommitments.map((c) => (
              <li key={c.id} className="card flex items-center gap-1 px-2 py-1 text-sm transition-shadow hover:shadow-[var(--shadow-md)]">
                <button
                  type="button"
                  onClick={() => completeCommitment(c.id)}
                  aria-label={`Mark "${c.title}" as done`}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center"
                >
                  <span
                    className="h-5 w-5 rounded-full border-2 border-[var(--color-border-strong)] transition-colors"
                    aria-hidden="true"
                  />
                </button>
                <Link to={`/edit/${c.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2.5">
                  <span className="truncate font-medium">{c.title}</span>
                  <span className="flex-shrink-0 rounded-full bg-[var(--color-surface-sunken)] px-2 py-1 text-xs font-medium text-[var(--color-ink-soft)]">
                    {CATEGORY_LABEL[c.category]}
                  </span>
                </Link>
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
