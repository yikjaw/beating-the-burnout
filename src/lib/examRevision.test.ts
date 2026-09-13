import { describe, expect, it } from 'vitest'
import { computeRevisionSuggestion, revisionTitle } from './examRevision'
import type { Exam } from './examRevision'
import type { Commitment } from './types'

const NOW = new Date('2026-09-16T12:00:00') // a Wednesday

function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: 'Calculus Final',
    examAt: new Date('2026-09-25T09:00:00').toISOString(),
    revisionHoursPerWeek: 5,
    ...overrides,
  }
}

function makeRevisionCommitment(examTitle: string, dueAt: string, effortHours: number): Commitment {
  return {
    id: crypto.randomUUID(),
    title: revisionTitle(examTitle),
    category: 'mental',
    effort_hours: effortHours,
    due_at: dueAt,
    priority: 2,
    is_flexible: true,
    status: 'open',
  }
}

const FREE_SLOTS = [{ startHour: 14, endHour: 17 }]

describe('computeRevisionSuggestion', () => {
  it('returns null when there are no exams', () => {
    expect(computeRevisionSuggestion([], [], FREE_SLOTS, NOW)).toBeNull()
  })

  it('returns null when there are no free slots', () => {
    expect(computeRevisionSuggestion([makeExam()], [], [], NOW)).toBeNull()
  })

  it('ignores exams that have already happened', () => {
    const pastExam = makeExam({ examAt: new Date('2026-09-01T09:00:00').toISOString() })
    expect(computeRevisionSuggestion([pastExam], [], FREE_SLOTS, NOW)).toBeNull()
  })

  it('ignores exams with no revision goal set', () => {
    const exam = makeExam({ revisionHoursPerWeek: 0 })
    expect(computeRevisionSuggestion([exam], [], FREE_SLOTS, NOW)).toBeNull()
  })

  it('suggests a revision block when the weekly target is unmet', () => {
    const exam = makeExam({ revisionHoursPerWeek: 5 })
    const result = computeRevisionSuggestion([exam], [], FREE_SLOTS, NOW)
    expect(result?.exam.title).toBe('Calculus Final')
    expect(result?.hours).toBe(3) // capped by the 3-hour slot, not the 5-hour target
  })

  it('returns null once this week\'s target is already met', () => {
    const exam = makeExam({ revisionHoursPerWeek: 5 })
    // Wednesday of the same week as NOW (2026-09-16)
    const alreadyLogged = makeRevisionCommitment(exam.title, new Date('2026-09-15T18:00:00').toISOString(), 5)
    expect(computeRevisionSuggestion([exam], [alreadyLogged], FREE_SLOTS, NOW)).toBeNull()
  })

  it('accounts for hours already logged this week when capping the suggestion', () => {
    const exam = makeExam({ revisionHoursPerWeek: 5 })
    const loggedSoFar = makeRevisionCommitment(exam.title, new Date('2026-09-15T18:00:00').toISOString(), 3)
    const result = computeRevisionSuggestion([exam], [loggedSoFar], FREE_SLOTS, NOW)
    expect(result?.hours).toBe(2) // 5 target - 3 logged = 2 remaining
  })

  it('does not count revision hours logged in a different week', () => {
    const exam = makeExam({ revisionHoursPerWeek: 5 })
    const lastWeek = makeRevisionCommitment(exam.title, new Date('2026-09-08T18:00:00').toISOString(), 5)
    const result = computeRevisionSuggestion([exam], [lastWeek], FREE_SLOTS, NOW)
    expect(result?.hours).toBe(3) // last week's hours don't count toward this week
  })

  it('picks the soonest exam among several with unmet targets', () => {
    const soon = makeExam({ title: 'Soon Exam', examAt: new Date('2026-09-18T09:00:00').toISOString() })
    const later = makeExam({ title: 'Later Exam', examAt: new Date('2026-10-01T09:00:00').toISOString() })
    const result = computeRevisionSuggestion([later, soon], [], FREE_SLOTS, NOW)
    expect(result?.exam.title).toBe('Soon Exam')
  })

  it('skips an exam whose target is met and falls through to the next one', () => {
    const soon = makeExam({ title: 'Soon Exam', examAt: new Date('2026-09-18T09:00:00').toISOString(), revisionHoursPerWeek: 5 })
    const later = makeExam({ title: 'Later Exam', examAt: new Date('2026-10-01T09:00:00').toISOString(), revisionHoursPerWeek: 5 })
    const soonAlreadyDone = makeRevisionCommitment(soon.title, new Date('2026-09-15T18:00:00').toISOString(), 5)
    const result = computeRevisionSuggestion([soon, later], [soonAlreadyDone], FREE_SLOTS, NOW)
    expect(result?.exam.title).toBe('Later Exam')
  })
})
