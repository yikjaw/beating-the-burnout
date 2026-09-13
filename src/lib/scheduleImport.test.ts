import { describe, expect, it } from 'vitest'
import { expandClassToCommitments } from './scheduleImport'
import type { DetectedClass } from './scheduleImport'

describe('expandClassToCommitments', () => {
  it('generates one commitment per week within the term, on the correct weekday', () => {
    const termStart = new Date('2026-09-14T00:00:00') // a Monday
    const termEnd = new Date('2026-10-04T00:00:00') // covers Sep 16, 23, 30 (Wednesdays)
    const detected: DetectedClass = {
      title: 'Calculus',
      day_of_week: 'wednesday',
      start_time: '10:00',
      end_time: '11:30',
    }

    const result = expandClassToCommitments(detected, termStart, termEnd)

    expect(result).toHaveLength(3)
    for (const commitment of result) {
      expect(new Date(commitment.due_at as string).getDay()).toBe(3) // Wednesday
    }
  })

  it('spaces occurrences exactly one week apart', () => {
    const termStart = new Date('2026-09-14T00:00:00')
    const termEnd = new Date('2026-09-30T00:00:00')
    const detected: DetectedClass = { title: 'Lab', day_of_week: 'friday', start_time: '09:00', end_time: '12:00' }

    const result = expandClassToCommitments(detected, termStart, termEnd)
    const first = new Date(result[0].due_at as string).getTime()
    const second = new Date(result[1].due_at as string).getTime()

    expect(second - first).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('produces no commitments when the term ends before the class next occurs', () => {
    const termStart = new Date('2026-09-14T00:00:00') // Monday
    const termEnd = new Date('2026-09-15T00:00:00') // Tuesday — before Wednesday
    const detected: DetectedClass = { title: 'Calculus', day_of_week: 'wednesday', start_time: '10:00', end_time: '11:00' }

    expect(expandClassToCommitments(detected, termStart, termEnd)).toEqual([])
  })

  it('includes an occurrence that falls exactly on the term end date', () => {
    const termStart = new Date('2026-09-14T00:00:00') // Monday
    const termEnd = new Date('2026-09-16T00:00:00') // Wednesday, same week
    const detected: DetectedClass = { title: 'Calculus', day_of_week: 'wednesday', start_time: '10:00', end_time: '11:00' }

    expect(expandClassToCommitments(detected, termStart, termEnd)).toHaveLength(1)
  })

  it('computes effort_hours from the start/end time difference', () => {
    const detected: DetectedClass = { title: 'Seminar', day_of_week: 'monday', start_time: '14:00', end_time: '15:30' }
    const termStart = new Date('2026-09-14T00:00:00')
    const termEnd = new Date('2026-09-21T00:00:00')
    const [result] = expandClassToCommitments(detected, termStart, termEnd)
    expect(result.effort_hours).toBe(1.5)
  })

  it('marks every occurrence as inflexible, high priority, in the time category', () => {
    const detected: DetectedClass = { title: 'Tutorial', day_of_week: 'tuesday', start_time: '13:00', end_time: '14:00' }
    const termStart = new Date('2026-09-14T00:00:00')
    const termEnd = new Date('2026-09-21T00:00:00')
    const [result] = expandClassToCommitments(detected, termStart, termEnd)
    expect(result.is_flexible).toBe(false)
    expect(result.priority).toBe(1)
    expect(result.category).toBe('time')
  })

  it('never produces a zero or negative effort_hours', () => {
    const detected: DetectedClass = { title: 'Odd', day_of_week: 'monday', start_time: '10:00', end_time: '10:00' }
    const termStart = new Date('2026-09-14T00:00:00')
    const termEnd = new Date('2026-09-21T00:00:00')
    const [result] = expandClassToCommitments(detected, termStart, termEnd)
    expect(result.effort_hours).toBeGreaterThan(0)
  })

  it('produces only a single occurrence when recurs is false, ignoring termEnd', () => {
    const termStart = new Date('2026-09-14T00:00:00') // Monday
    const termEnd = new Date('2026-12-31T00:00:00') // a whole semester away
    const detected: DetectedClass = { title: 'Midterm exam', day_of_week: 'wednesday', start_time: '10:00', end_time: '12:00' }

    const result = expandClassToCommitments(detected, termStart, termEnd, false)

    expect(result).toHaveLength(1)
    expect(new Date(result[0].due_at as string).getDate()).toBe(16) // the next Wednesday, Sep 16
  })

  it('still lands on the next occurrence when recurs is false and termStart is not the target weekday', () => {
    const termStart = new Date('2026-09-17T00:00:00') // a Thursday
    const termEnd = new Date('2026-12-31T00:00:00')
    const detected: DetectedClass = { title: 'One-off session', day_of_week: 'monday', start_time: '09:00', end_time: '10:00' }

    const result = expandClassToCommitments(detected, termStart, termEnd, false)

    expect(result).toHaveLength(1)
    expect(new Date(result[0].due_at as string).getDay()).toBe(1) // Monday
  })
})
