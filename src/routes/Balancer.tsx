import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { categoryLoad, feltMultiplier, overallCapacity, rebalance } from '../lib/scoring'

const RECENT_CHECKIN_WINDOW = 3

export function Balancer() {
  const { capacities, commitments, checkins, deferCommitments, logRebalanceSuggestion } = useAppData()
  const navigate = useNavigate()

  const loads = categoryLoad(commitments, capacities)
  const recent = checkins.slice(-RECENT_CHECKIN_WINDOW)
  const current = overallCapacity(loads, recent)
  const multiplier = feltMultiplier(recent)

  const result = useMemo(() => rebalance(commitments, loads), [commitments, loads])
  const projectedFelt = Math.min(1.5, Math.max(0, result.projectedScore * multiplier))

  const currentPct = Math.round(current.percentage * 100)
  const projectedPct = Math.round(projectedFelt * 100)

  async function handleAccept() {
    await deferCommitments(result.moves)
    await logRebalanceSuggestion(result.moves, true)
    navigate('/')
  }

  async function handleReject() {
    await logRebalanceSuggestion(result.moves, false)
    navigate('/')
  }

  if (result.moves.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <p className="text-lg font-medium">Nothing to rebalance right now.</p>
        <p className="text-sm text-[var(--color-ink-soft)]">
          You're at {currentPct}%. Either you're within capacity, or everything on your plate is fixed and can't
          move.
        </p>
      </div>
    )
  }

  const moveList = result.moves.map((m) => `'${m.title}'`)
  const moveSentence =
    moveList.length === 1 ? moveList[0] : `${moveList.slice(0, -1).join(', ')} and ${moveList[moveList.length - 1]}`

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Here's what to move</h1>

      <p className="text-lg leading-relaxed">
        Move {moveSentence} to next week — that takes you from{' '}
        <span className="font-semibold text-[var(--color-flag)]">{currentPct}%</span> to{' '}
        <span className="font-semibold text-[var(--color-accent-strong)]">{projectedPct}%</span>.
      </p>

      <ul className="flex flex-col gap-2">
        {result.moves.map((m) => (
          <li
            key={m.commitmentId}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 text-sm"
          >
            <span className="font-medium">{m.title}</span>
            <span className="text-[var(--color-ink-soft)]"> → next week</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleAccept}
          className="rounded-xl bg-[var(--color-accent)] px-6 py-4 text-base font-semibold text-white"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={handleReject}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-6 py-4 text-base font-medium text-[var(--color-ink)]"
        >
          Not this one
        </button>
      </div>
    </div>
  )
}
