import type { FreeSlot } from './freeTime'
import type { Commitment } from './types'

export interface Exam {
  id: string
  title: string
  examAt: string
  revisionHoursPerWeek: number
}

export interface RevisionSuggestion {
  exam: Exam
  slot: FreeSlot
  hours: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const REVISION_PREFIX = 'Revise: '

/** The exact title used for revision-block commitments, so logged hours can be matched back to an exam. */
export function revisionTitle(examTitle: string): string {
  return `${REVISION_PREFIX}${examTitle}`
}

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - d.getDay()) // back to Sunday
  return d
}

function hoursLoggedThisWeek(commitments: Commitment[], examTitle: string, now: Date): number {
  const weekStart = startOfWeek(now).getTime()
  const weekEnd = weekStart + 7 * DAY_MS
  const tag = revisionTitle(examTitle)

  return commitments
    .filter((c) => c.status !== 'done' && c.title === tag && c.due_at)
    .filter((c) => {
      const t = new Date(c.due_at as string).getTime()
      return t >= weekStart && t < weekEnd
    })
    .reduce((sum, c) => sum + c.effort_hours, 0)
}

/**
 * Picks the soonest upcoming exam whose weekly revision target isn't met
 * yet, and proposes filling the largest free slot with a revision block —
 * capped at whatever's still needed this week and at the slot's own size.
 * Past exams and exams with no revision goal set are ignored.
 */
export function computeRevisionSuggestion(
  exams: Exam[],
  commitments: Commitment[],
  freeSlots: FreeSlot[],
  now: Date = new Date(),
): RevisionSuggestion | null {
  if (freeSlots.length === 0) return null

  const upcoming = exams
    .filter((e) => new Date(e.examAt).getTime() > now.getTime() && e.revisionHoursPerWeek > 0)
    .sort((a, b) => new Date(a.examAt).getTime() - new Date(b.examAt).getTime())

  const largestSlot = freeSlots.reduce((a, b) => (b.endHour - b.startHour > a.endHour - a.startHour ? b : a))
  const slotDuration = largestSlot.endHour - largestSlot.startHour
  if (slotDuration < 0.5) return null

  for (const exam of upcoming) {
    const remaining = exam.revisionHoursPerWeek - hoursLoggedThisWeek(commitments, exam.title, now)
    if (remaining <= 0) continue

    const hours = Math.round(Math.min(remaining, slotDuration) * 4) / 4
    return { exam, slot: largestSlot, hours }
  }

  return null
}
