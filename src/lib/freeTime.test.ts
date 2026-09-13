import { describe, expect, it } from 'vitest'
import { computeFreeSlots, recommendActivity } from './freeTime'
import type { PreferredActivity } from './freeTime'
import type { Commitment } from './types'

const TODAY = new Date('2026-09-13T12:00:00')

function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: 'Untitled',
    category: 'time',
    effort_hours: 2,
    due_at: null,
    priority: 2,
    is_flexible: true,
    status: 'open',
    ...overrides,
  }
}

function dueAt(hour: number, minute = 0): string {
  const d = new Date(TODAY)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

describe('computeFreeSlots', () => {
  it('returns the whole awake window when there are no commitments', () => {
    const result = computeFreeSlots([], '07:00', '23:00', TODAY)
    expect(result).toEqual([{ startHour: 7, endHour: 23 }])
  })

  it('subtracts a busy block in the middle of the day', () => {
    const commitments = [makeCommitment({ due_at: dueAt(14), effort_hours: 2 })] // busy 12-14
    const result = computeFreeSlots(commitments, '07:00', '23:00', TODAY)
    expect(result).toEqual([
      { startHour: 7, endHour: 12 },
      { startHour: 14, endHour: 23 },
    ])
  })

  it('ignores commitments due on a different day', () => {
    const tomorrow = new Date(TODAY)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const commitments = [makeCommitment({ due_at: tomorrow.toISOString(), effort_hours: 2 })]
    const result = computeFreeSlots(commitments, '07:00', '23:00', TODAY)
    expect(result).toEqual([{ startHour: 7, endHour: 23 }])
  })

  it('ignores commitments with no deadline', () => {
    const commitments = [makeCommitment({ due_at: null })]
    const result = computeFreeSlots(commitments, '07:00', '23:00', TODAY)
    expect(result).toEqual([{ startHour: 7, endHour: 23 }])
  })

  it('excludes slots shorter than the minimum', () => {
    const commitments = [makeCommitment({ due_at: dueAt(12, 15), effort_hours: 5 })] // busy 7:15-12:15
    const result = computeFreeSlots(commitments, '07:00', '23:00', TODAY, 0.5)
    // the 7:00-7:15 sliver should be dropped, only the afternoon remains
    expect(result).toEqual([{ startHour: 12.25, endHour: 23 }])
  })

  it('handles a bedtime past midnight', () => {
    const result = computeFreeSlots([], '07:00', '01:00', TODAY)
    expect(result).toEqual([{ startHour: 7, endHour: 25 }])
  })

  it('returns no slots when the day is fully booked', () => {
    const commitments = [makeCommitment({ due_at: dueAt(23), effort_hours: 16 })]
    const result = computeFreeSlots(commitments, '07:00', '23:00', TODAY)
    expect(result).toEqual([])
  })
})

describe('recommendActivity', () => {
  const preferences: PreferredActivity[] = [
    { name: 'Basketball', category: 'physical' },
    { name: 'Board games', category: 'social' },
  ]

  it('returns null when there are no free slots', () => {
    expect(recommendActivity([], preferences, 1)).toBeNull()
  })

  it('picks the largest slot when several are available', () => {
    const slots = [
      { startHour: 7, endHour: 8 },
      { startHour: 14, endHour: 18 },
    ]
    const result = recommendActivity(slots, preferences, 1) // not a multiple of 3 -> preferred
    expect(result?.slot).toEqual({ startHour: 14, endHour: 18 })
  })

  it('suggests a novel activity every third day', () => {
    const slots = [{ startHour: 14, endHour: 18 }]
    const result = recommendActivity(slots, preferences, 3)
    expect(result?.isNovel).toBe(true)
  })

  it('suggests from preferences on non-multiple-of-3 days when preferences exist', () => {
    const slots = [{ startHour: 14, endHour: 18 }]
    const result = recommendActivity(slots, preferences, 1)
    expect(result?.isNovel).toBe(false)
    expect(preferences.map((p) => p.name)).toContain(result?.activity)
  })

  it('always suggests something novel when there are no preferences', () => {
    const slots = [{ startHour: 14, endHour: 18 }]
    const result = recommendActivity(slots, [], 1)
    expect(result?.isNovel).toBe(true)
  })
})
