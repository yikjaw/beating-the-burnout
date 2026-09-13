import type { WearableMetric } from './fitbit'
import { CATEGORIES, type CategoryLoadMap, type CheckIn, type Commitment } from './types'

const DAY_MS = 24 * 60 * 60 * 1000
const NUDGE_STRESS_THRESHOLD = 4
const NUDGE_STRESS_STREAK = 3
const NUDGE_LOAD_THRESHOLD = 0.95

// These thresholds are reasonable defaults for a hackathon prototype, not
// clinical guidance — easy to retune once real usage data exists.
const POOR_SLEEP_MINUTES = 360 // 6 hours
const ELEVATED_HR_FACTOR = 1.1 // 10% above the person's own recent baseline
const LOW_STEPS_THRESHOLD = 3000
const LOW_STEPS_CHECK_HOUR = 18 // only flag inactivity once most of the day has passed

export type NudgeReason = 'poor-sleep' | 'elevated-heart-rate' | 'low-activity' | 'overload' | 'stress-streak'

export interface RecoveryNudge {
  reason: NudgeReason
  category: 'social' | 'physical'
  title: string
  message: string
  effortHours: number
  dueAt: string
}

function averageLoad(loads: CategoryLoadMap): number {
  const values = CATEGORIES.map((c) => loads[c])
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function averageRestingHeartRate(history: WearableMetric[]): number | null {
  const values = history.map((m) => m.resting_heart_rate).filter((v): v is number => v !== null)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** A proxy for "your only clear window" given we only know due-date density, not literal free/busy blocks. */
function leastBookedUpcomingDay(commitments: Commitment[], now: Date): { offset: number; dayLabel: string } {
  const dayCounts = new Array(7).fill(0)
  for (const c of commitments) {
    if (c.status !== 'open' || !c.due_at) continue
    const diffDays = Math.floor((new Date(c.due_at).getTime() - now.getTime()) / DAY_MS)
    if (diffDays >= 0 && diffDays < 7) dayCounts[diffDays] += 1
  }

  let bestOffset = 1
  let bestCount = Number.POSITIVE_INFINITY
  for (let offset = 1; offset < 7; offset += 1) {
    if (dayCounts[offset] < bestCount) {
      bestCount = dayCounts[offset]
      bestOffset = offset
    }
  }

  const date = new Date(now.getTime() + bestOffset * DAY_MS)
  return { offset: bestOffset, dayLabel: date.toLocaleDateString('en-US', { weekday: 'long' }) }
}

function recoveryBlock(commitments: Commitment[], loads: CategoryLoadMap, now: Date): RecoveryNudge {
  const category: 'social' | 'physical' = loads.social <= loads.physical ? 'social' : 'physical'
  const { offset, dayLabel } = leastBookedUpcomingDay(commitments, now)
  const dueDate = new Date(now.getTime() + offset * DAY_MS)
  dueDate.setHours(18, 0, 0, 0)

  return {
    reason: 'overload',
    category,
    title: category === 'social' ? 'Protected time with people' : 'Protected recovery time',
    message: `${dayLabel} evening is your only clear window this week — keep it free?`,
    effortHours: 3,
    dueAt: dueDate.toISOString(),
  }
}

/**
 * Picks at most one actionable nudge, checked in priority order: real
 * physiological signals (sleep, heart rate, activity) before schedule-derived
 * ones (overload, a stress streak). Returns null when nothing warrants a
 * nudge right now. Accepting the returned nudge should write it as a real,
 * inflexible commitment — this is meant to change the schedule, not just be
 * read.
 */
export function computeRecoveryNudge(
  commitments: Commitment[],
  loads: CategoryLoadMap,
  recentCheckins: CheckIn[],
  todayWearable: WearableMetric | null,
  wearableHistory: WearableMetric[],
  now: Date = new Date(),
): RecoveryNudge | null {
  if (todayWearable?.sleep_minutes != null && todayWearable.sleep_minutes < POOR_SLEEP_MINUTES) {
    const hours = Math.floor(todayWearable.sleep_minutes / 60)
    const minutes = todayWearable.sleep_minutes % 60
    const tonight = new Date(now)
    tonight.setHours(22, 0, 0, 0)
    if (tonight.getTime() < now.getTime()) tonight.setDate(tonight.getDate() + 1)

    return {
      reason: 'poor-sleep',
      category: 'physical',
      title: 'Wind down early',
      message: `You slept ${hours}h ${minutes}m last night — want to protect an earlier bedtime tonight?`,
      effortHours: 1,
      dueAt: tonight.toISOString(),
    }
  }

  const baseline = averageRestingHeartRate(wearableHistory.filter((m) => m.logged_on !== todayWearable?.logged_on))
  if (
    todayWearable?.resting_heart_rate != null &&
    baseline != null &&
    todayWearable.resting_heart_rate > baseline * ELEVATED_HR_FACTOR
  ) {
    const block = recoveryBlock(commitments, loads, now)
    return {
      ...block,
      reason: 'elevated-heart-rate',
      message: `Your resting heart rate is higher than usual today — ${block.message.toLowerCase()}`,
    }
  }

  if (now.getHours() >= LOW_STEPS_CHECK_HOUR && todayWearable?.steps != null && todayWearable.steps < LOW_STEPS_THRESHOLD) {
    const dueDate = new Date(now)
    dueDate.setMinutes(0, 0, 0)
    dueDate.setHours(dueDate.getHours() + 1)

    return {
      reason: 'low-activity',
      category: 'physical',
      title: 'Get moving',
      message: `Only ${todayWearable.steps.toLocaleString()} steps so far today — a short walk before the day ends?`,
      effortHours: 0.5,
      dueAt: dueDate.toISOString(),
    }
  }

  const overallPercentage = averageLoad(loads)
  const overloaded = overallPercentage > NUDGE_LOAD_THRESHOLD
  const lastStreak = recentCheckins.slice(-NUDGE_STRESS_STREAK)
  const stressedStreak = lastStreak.length === NUDGE_STRESS_STREAK && lastStreak.every((c) => c.stress >= NUDGE_STRESS_THRESHOLD)

  if (overloaded || stressedStreak) {
    const block = recoveryBlock(commitments, loads, now)
    return { ...block, reason: overloaded ? 'overload' : 'stress-streak' }
  }

  return null
}
