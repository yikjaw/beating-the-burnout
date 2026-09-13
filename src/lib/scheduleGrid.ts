import type { Commitment } from './types'

export const DAY_WINDOW_START = 6
export const DAY_WINDOW_END = 23

export interface TimeBlock {
  commitment: Commitment
  startHour: number
  endHour: number
}

function isScheduled(commitment: Commitment): boolean {
  return commitment.status !== 'done' && commitment.due_at !== null
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Open or deferred commitments whose deadline falls on the given day. */
export function commitmentsOnDate(commitments: Commitment[], date: Date): Commitment[] {
  return commitments.filter((c) => isScheduled(c) && sameCalendarDay(new Date(c.due_at as string), date))
}

/** Calendar-day keys (toDateString) that have at least one scheduled commitment — for marking a month grid. */
export function datesWithCommitments(commitments: Commitment[]): Set<string> {
  const dates = new Set<string>()
  for (const c of commitments) {
    if (!isScheduled(c)) continue
    dates.add(new Date(c.due_at as string).toDateString())
  }
  return dates
}

/**
 * Commitments only store a deadline and a duration, not a scheduled start
 * time, so the timetable treats the block as ending at the deadline and
 * running backwards for `effort_hours` — an approximation, not a literal
 * schedule. Clipped to the display window so it always renders a visible
 * block even for late-night deadlines or very long efforts.
 */
export function timeBlockForCommitment(
  commitment: Commitment,
  windowStart: number = DAY_WINDOW_START,
  windowEnd: number = DAY_WINDOW_END,
): TimeBlock | null {
  if (!commitment.due_at) return null

  const due = new Date(commitment.due_at)
  const dueHour = due.getHours() + due.getMinutes() / 60

  const endHour = Math.min(windowEnd, Math.max(windowStart, dueHour))
  const desiredStartHour = endHour - commitment.effort_hours
  const startHour = Math.min(endHour - 0.5, Math.max(windowStart, desiredStartHour))

  return { commitment, startHour, endHour }
}

export function formatHourLabel(hour: number): string {
  const wholeHour = Math.floor(hour)
  const minutes = Math.round((hour - wholeHour) * 60)
  const period = wholeHour >= 12 ? 'PM' : 'AM'
  const displayHour = wholeHour % 12 === 0 ? 12 : wholeHour % 12
  return minutes === 0 ? `${displayHour}${period}` : `${displayHour}:${String(minutes).padStart(2, '0')}${period}`
}
