import { describe, expect, it } from 'vitest'
import { commitmentsOnDate, datesWithCommitments, formatHourLabel, timeBlockForCommitment } from './scheduleGrid'
import type { Commitment } from './types'

function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: 'Untitled',
    category: 'time',
    effort_hours: 2,
    due_at: '2026-09-15T14:00:00.000Z',
    priority: 2,
    is_flexible: true,
    status: 'open',
    ...overrides,
  }
}

describe('commitmentsOnDate', () => {
  it('returns commitments due on the given day, ignoring time of day', () => {
    const target = new Date('2026-09-15T00:00:00')
    const onDay = makeCommitment({ id: 'a', due_at: new Date('2026-09-15T09:30:00').toISOString() })
    const otherDay = makeCommitment({ id: 'b', due_at: new Date('2026-09-16T09:30:00').toISOString() })
    expect(commitmentsOnDate([onDay, otherDay], target).map((c) => c.id)).toEqual(['a'])
  })

  it('excludes done commitments and ones with no deadline', () => {
    const target = new Date('2026-09-15T00:00:00')
    const done = makeCommitment({ id: 'a', status: 'done', due_at: new Date('2026-09-15T09:30:00').toISOString() })
    const noDeadline = makeCommitment({ id: 'b', due_at: null })
    expect(commitmentsOnDate([done, noDeadline], target)).toEqual([])
  })
})

describe('datesWithCommitments', () => {
  it('marks only days that have a scheduled commitment', () => {
    const c = makeCommitment({ due_at: new Date('2026-09-15T09:30:00').toISOString() })
    const dates = datesWithCommitments([c])
    expect(dates.has(new Date('2026-09-15T09:30:00').toDateString())).toBe(true)
    expect(dates.size).toBe(1)
  })
})

describe('timeBlockForCommitment', () => {
  it('returns null when there is no deadline', () => {
    expect(timeBlockForCommitment(makeCommitment({ due_at: null }))).toBeNull()
  })

  it('ends at the deadline hour and starts effort_hours earlier', () => {
    const c = makeCommitment({ due_at: new Date('2026-09-15T14:00:00').toISOString(), effort_hours: 2 })
    const block = timeBlockForCommitment(c, 6, 23)
    expect(block?.endHour).toBe(14)
    expect(block?.startHour).toBe(12)
  })

  it('clips to the display window instead of running off it', () => {
    const c = makeCommitment({ due_at: new Date('2026-09-15T07:00:00').toISOString(), effort_hours: 5 })
    const block = timeBlockForCommitment(c, 6, 23)
    expect(block?.startHour).toBe(6)
  })

  it('always produces a visible block even for a zero-length window', () => {
    const c = makeCommitment({ due_at: new Date('2026-09-15T06:00:00').toISOString(), effort_hours: 0.5 })
    const block = timeBlockForCommitment(c, 6, 23)
    expect(block!.endHour).toBeGreaterThan(block!.startHour)
  })
})

describe('formatHourLabel', () => {
  it('formats whole hours without minutes', () => {
    expect(formatHourLabel(6)).toBe('6AM')
    expect(formatHourLabel(13)).toBe('1PM')
    expect(formatHourLabel(0)).toBe('12AM')
    expect(formatHourLabel(12)).toBe('12PM')
  })

  it('formats fractional hours with minutes', () => {
    expect(formatHourLabel(14.5)).toBe('2:30PM')
  })
})
