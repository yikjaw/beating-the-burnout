import { CATEGORIES } from './types'
import type { CapacityMap, Category, CategoryLoadMap, CheckIn, Commitment, Priority } from './types'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const PRIORITY_WEIGHT: Record<Priority, number> = {
  1: 1.3,
  2: 1.0,
  3: 0.7,
}

const OVERALL_CAP = 1.5
const FLAG_THRESHOLD = 0.85
const REBALANCE_THRESHOLD = 0.95
const MAX_MOVES = 3
const WEEK_MS = 7 * DAY_MS

/**
 * Urgency multiplier for a deadline, relative to `now`.
 * No deadline is treated as unhurried (1.0), same as a distant deadline.
 */
export function urgency(dueAt: string | null | undefined, now: Date = new Date()): number {
  if (!dueAt) return 1.0

  const due = new Date(dueAt).getTime()
  const nowMs = now.getTime()
  const diff = due - nowMs

  if (diff < 0) return 2.0
  if (diff <= 48 * HOUR_MS) return 1.8
  if (diff <= 7 * DAY_MS) return 1.4
  return 1.0
}

function priorityWeight(priority: Priority): number {
  return PRIORITY_WEIGHT[priority]
}

/** Raw weighted effort contribution of a single open commitment. */
function contribution(commitment: Commitment, now: Date): number {
  return commitment.effort_hours * urgency(commitment.due_at, now) * priorityWeight(commitment.priority)
}

/**
 * Per-category load: weighted booked effort divided by that category's
 * weekly capacity. 1.0 means exactly at capacity. A category with zero (or
 * missing) capacity but nonzero booked effort is infinitely overloaded —
 * represented as +Infinity so it always dominates the overall average and
 * gets flagged, and is later clamped by `overallCapacity`.
 */
export function categoryLoad(
  commitments: Commitment[],
  capacityHours: CapacityMap,
  now: Date = new Date(),
): CategoryLoadMap {
  const sums: CategoryLoadMap = {
    mental: 0,
    time: 0,
    physical: 0,
    social: 0,
    errands: 0,
  }

  for (const c of commitments) {
    if (c.status !== 'open') continue
    sums[c.category] += contribution(c, now)
  }

  const loads = {} as CategoryLoadMap
  for (const category of CATEGORIES) {
    const capacity = capacityHours[category] ?? 0
    const booked = sums[category]
    if (capacity <= 0) {
      loads[category] = booked > 0 ? Number.POSITIVE_INFINITY : 0
    } else {
      loads[category] = booked / capacity
    }
  }

  return loads
}

export interface OverallCapacityResult {
  percentage: number
  flaggedCategories: Category[]
}

/**
 * Blends booked-hours load with recent felt experience (stress/energy) into
 * a single "how loaded do you actually feel" percentage. Deliberately not
 * clamped to 1.0 — a student at 140% needs to see 140%, capped only at 1.5
 * so the number stays legible.
 */
/**
 * How much recent stress/energy should scale a plain booked-hours load, so
 * the score reflects felt load rather than just hours on a calendar.
 * Neutral midpoint is 3 on a 1-5 scale; each point above/below nudges the
 * felt score by 5%. No check-ins means no adjustment (1.0).
 */
export function feltMultiplier(recentCheckins: CheckIn[]): number {
  if (recentCheckins.length === 0) return 1

  const avgStress = recentCheckins.reduce((s, c) => s + c.stress, 0) / recentCheckins.length
  const avgEnergy = recentCheckins.reduce((s, c) => s + c.energy, 0) / recentCheckins.length

  const stressFactor = 1 + (avgStress - 3) * 0.05
  const energyFactor = 1 - (avgEnergy - 3) * 0.05

  return stressFactor * energyFactor
}

export function overallCapacity(
  loads: CategoryLoadMap,
  recentCheckins: CheckIn[],
): OverallCapacityResult {
  const values = CATEGORIES.map((c) => loads[c])
  const base = values.reduce((sum, v) => sum + v, 0) / values.length

  const felt = base * feltMultiplier(recentCheckins)
  const percentage = Math.min(OVERALL_CAP, Math.max(0, felt))

  const flaggedCategories = CATEGORIES.filter((c) => loads[c] > FLAG_THRESHOLD)

  return { percentage, flaggedCategories }
}

export interface RebalanceMove {
  commitmentId: string
  title: string
  category: Category
  fromDueAt: string | null
  deferredTo: string
}

export interface RebalanceResult {
  moves: RebalanceMove[]
  projectedScore: number
}

function average(loads: CategoryLoadMap): number {
  const values = CATEGORIES.map((c) => loads[c])
  const sum = values.reduce((s, v) => s + v, 0)
  return sum / values.length
}

/**
 * Proposes deferring flexible, open commitments (lowest priority and
 * furthest deadline first) one week at a time until the projected overall
 * load drops to 0.95 or below, or 3 moves have been made — whichever comes
 * first. Never mutates its inputs; the caller decides whether to apply.
 *
 * Because load is linear in booked effort, removing a commitment's
 * contribution can be projected by scaling that category's load by the
 * remaining share of its total weighted effort, without needing capacity
 * figures here.
 */
export function rebalance(
  commitments: Commitment[],
  loads: CategoryLoadMap,
  now: Date = new Date(),
): RebalanceResult {
  const workingLoads: CategoryLoadMap = { ...loads }

  const categoryTotals: CategoryLoadMap = {
    mental: 0,
    time: 0,
    physical: 0,
    social: 0,
    errands: 0,
  }
  for (const c of commitments) {
    if (c.status !== 'open') continue
    categoryTotals[c.category] += contribution(c, now)
  }

  const candidates = commitments
    .filter((c) => c.status === 'open' && c.is_flexible)
    .slice()
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority // higher number = lower priority, moved first
      const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY
      const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY
      return bDue - aDue // furthest deadline first
    })

  const moves: RebalanceMove[] = []

  for (const candidate of candidates) {
    if (moves.length >= MAX_MOVES) break
    if (average(workingLoads) <= REBALANCE_THRESHOLD) break

    const category = candidate.category
    const total = categoryTotals[category]
    const effort = contribution(candidate, now)

    if (total > 0 && Number.isFinite(workingLoads[category])) {
      workingLoads[category] = workingLoads[category] * ((total - effort) / total)
    } else if (!Number.isFinite(workingLoads[category])) {
      // Infinite load from zero capacity: removing effort still leaves it
      // undefined-capacity, but no longer booked if this was the only item.
      workingLoads[category] = total - effort > 0 ? Number.POSITIVE_INFINITY : 0
    }
    categoryTotals[category] = Math.max(0, total - effort)

    const base = candidate.due_at ? new Date(candidate.due_at) : now
    const deferredTo = new Date(base.getTime() + WEEK_MS)

    moves.push({
      commitmentId: candidate.id,
      title: candidate.title,
      category,
      fromDueAt: candidate.due_at,
      deferredTo: deferredTo.toISOString(),
    })
  }

  const projectedScore = Math.min(OVERALL_CAP, Math.max(0, average(workingLoads)))

  return { moves, projectedScore }
}
