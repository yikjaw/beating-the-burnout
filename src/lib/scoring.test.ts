import { describe, expect, it } from 'vitest'
import { categoryLoad, overallCapacity, rebalance, urgency } from './scoring'
import type { CapacityMap, CheckIn, Commitment } from './types'

const NOW = new Date('2026-09-13T12:00:00Z')

function hoursFromNow(hours: number): string {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000).toISOString()
}

function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: 'Untitled',
    category: 'time',
    effort_hours: 2,
    due_at: hoursFromNow(72),
    priority: 2,
    is_flexible: true,
    status: 'open',
    ...overrides,
  }
}

const fullCapacity: CapacityMap = {
  mental: 10,
  time: 10,
  physical: 10,
  social: 10,
  errands: 10,
}

const zeroCapacity: CapacityMap = {
  mental: 0,
  time: 0,
  physical: 0,
  social: 0,
  errands: 0,
}

describe('urgency', () => {
  it('returns 1.0 when there is no deadline', () => {
    expect(urgency(null, NOW)).toBe(1.0)
    expect(urgency(undefined, NOW)).toBe(1.0)
  })

  it('returns 2.0 for an overdue deadline', () => {
    expect(urgency(hoursFromNow(-1), NOW)).toBe(2.0)
  })

  it('returns 1.8 for a deadline within 48 hours', () => {
    expect(urgency(hoursFromNow(47), NOW)).toBe(1.8)
    expect(urgency(hoursFromNow(48), NOW)).toBe(1.8)
  })

  it('returns 1.4 for a deadline within a week', () => {
    expect(urgency(hoursFromNow(49), NOW)).toBe(1.4)
    expect(urgency(hoursFromNow(24 * 7), NOW)).toBe(1.4)
  })

  it('returns 1.0 for a deadline more than a week away', () => {
    expect(urgency(hoursFromNow(24 * 7 + 1), NOW)).toBe(1.0)
  })
})

describe('categoryLoad', () => {
  it('returns all zeros for no commitments', () => {
    const loads = categoryLoad([], fullCapacity, NOW)
    expect(Object.values(loads).every((v) => v === 0)).toBe(true)
  })

  it('computes booked effort over capacity for a normal case', () => {
    const commitments = [
      makeCommitment({ category: 'time', effort_hours: 5, priority: 2, due_at: hoursFromNow(200) }),
    ]
    const loads = categoryLoad(commitments, fullCapacity, NOW)
    // 5 hours * urgency 1.0 * priorityWeight 1.0 / 10 capacity = 0.5
    expect(loads.time).toBeCloseTo(0.5)
    expect(loads.mental).toBe(0)
  })

  it('ignores non-open commitments', () => {
    const commitments = [makeCommitment({ status: 'done', effort_hours: 20 })]
    const loads = categoryLoad(commitments, fullCapacity, NOW)
    expect(loads.time).toBe(0)
  })

  it('treats zero capacity with booked effort as infinite load', () => {
    const commitments = [makeCommitment({ category: 'errands', effort_hours: 1 })]
    const loads = categoryLoad(commitments, zeroCapacity, NOW)
    expect(loads.errands).toBe(Number.POSITIVE_INFINITY)
  })

  it('treats zero capacity with no booked effort as zero load', () => {
    const loads = categoryLoad([], zeroCapacity, NOW)
    expect(loads.errands).toBe(0)
  })

  it('weighs priority correctly', () => {
    const high = makeCommitment({ category: 'mental', priority: 1, effort_hours: 10, due_at: hoursFromNow(200) })
    const low = makeCommitment({ category: 'social', priority: 3, effort_hours: 10, due_at: hoursFromNow(200) })
    const loads = categoryLoad([high, low], fullCapacity, NOW)
    expect(loads.mental).toBeGreaterThan(loads.social)
  })
})

describe('overallCapacity', () => {
  it('returns 0 with no commitments and no check-ins', () => {
    const loads = categoryLoad([], fullCapacity, NOW)
    const result = overallCapacity(loads, [])
    expect(result.percentage).toBe(0)
    expect(result.flaggedCategories).toEqual([])
  })

  it('is unaffected by check-ins when there are none', () => {
    const loads = categoryLoad(
      [makeCommitment({ category: 'time', effort_hours: 5, due_at: hoursFromNow(200) })],
      fullCapacity,
      NOW,
    )
    const result = overallCapacity(loads, [])
    expect(result.percentage).toBeCloseTo(0.1) // 0.5 / 5 categories
  })

  it('increases the felt score with high recent stress and low energy', () => {
    const loads = categoryLoad(
      [makeCommitment({ category: 'time', effort_hours: 10, due_at: hoursFromNow(200) })],
      fullCapacity,
      NOW,
    )
    const neutral: CheckIn[] = [{ logged_on: '2026-09-12', energy: 3, stress: 3, slept_well: true }]
    const stressed: CheckIn[] = [{ logged_on: '2026-09-12', energy: 1, stress: 5, slept_well: false }]

    const neutralResult = overallCapacity(loads, neutral)
    const stressedResult = overallCapacity(loads, stressed)

    expect(stressedResult.percentage).toBeGreaterThan(neutralResult.percentage)
  })

  it('caps the percentage at 1.5 without clamping to 1.0', () => {
    const commitments = [
      makeCommitment({ category: 'time', effort_hours: 100, due_at: hoursFromNow(200) }),
      makeCommitment({ category: 'mental', effort_hours: 100, due_at: hoursFromNow(200) }),
    ]
    const loads = categoryLoad(commitments, fullCapacity, NOW)
    const result = overallCapacity(loads, [])
    expect(result.percentage).toBe(1.5)
  })

  it('caps at 1.5 even with zero-capacity infinite load', () => {
    const commitments = [makeCommitment({ category: 'errands', effort_hours: 1 })]
    const loads = categoryLoad(commitments, zeroCapacity, NOW)
    const result = overallCapacity(loads, [])
    expect(result.percentage).toBe(1.5)
  })

  it('flags categories above 0.85', () => {
    const commitments = [makeCommitment({ category: 'physical', effort_hours: 9, due_at: hoursFromNow(200) })]
    const loads = categoryLoad(commitments, fullCapacity, NOW)
    const result = overallCapacity(loads, [])
    expect(result.flaggedCategories).toEqual(['physical'])
  })
})

describe('rebalance', () => {
  it('proposes no moves when there are no commitments', () => {
    const loads = categoryLoad([], fullCapacity, NOW)
    const result = rebalance([], loads, NOW)
    expect(result.moves).toEqual([])
    expect(result.projectedScore).toBe(0)
  })

  it('proposes no moves when overall is already at or below 0.95', () => {
    const commitments = [makeCommitment({ category: 'time', effort_hours: 1, due_at: hoursFromNow(200) })]
    const loads = categoryLoad(commitments, fullCapacity, NOW)
    const result = rebalance(commitments, loads, NOW)
    expect(result.moves).toEqual([])
  })

  it('proposes no moves when everything is inflexible, even if overloaded', () => {
    const commitments = [
      makeCommitment({ category: 'time', effort_hours: 50, is_flexible: false, due_at: hoursFromNow(200) }),
    ]
    const loads = categoryLoad(commitments, fullCapacity, NOW)
    const result = rebalance(commitments, loads, NOW)
    expect(result.moves).toEqual([])
    expect(result.projectedScore).toBe(loads.time / 5)
  })

  it('defers the lowest-priority, furthest-deadline flexible commitment first', () => {
    const soon = makeCommitment({
      id: 'soon',
      category: 'time',
      priority: 3,
      effort_hours: 40,
      due_at: hoursFromNow(100),
    })
    const far = makeCommitment({
      id: 'far',
      category: 'time',
      priority: 3,
      effort_hours: 40,
      due_at: hoursFromNow(500),
    })
    const loads = categoryLoad([soon, far], fullCapacity, NOW)
    const result = rebalance([soon, far], loads, NOW)
    expect(result.moves[0].commitmentId).toBe('far')
  })

  it('never moves more than 3 commitments', () => {
    const commitments = Array.from({ length: 6 }, (_, i) =>
      makeCommitment({ id: `c${i}`, category: 'time', effort_hours: 20, priority: 3, due_at: hoursFromNow(200 + i) }),
    )
    const loads = categoryLoad(commitments, fullCapacity, NOW)
    const result = rebalance(commitments, loads, NOW)
    expect(result.moves.length).toBeLessThanOrEqual(3)
  })

  it('reduces the projected score below the original', () => {
    const commitments = [
      makeCommitment({ id: 'a', category: 'time', effort_hours: 40, priority: 3, due_at: hoursFromNow(200) }),
      makeCommitment({ id: 'b', category: 'time', effort_hours: 40, priority: 2, due_at: hoursFromNow(300) }),
    ]
    const loads = categoryLoad(commitments, fullCapacity, NOW)
    const before = Object.values(loads).reduce((s, v) => s + v, 0) / 5
    const result = rebalance(commitments, loads, NOW)
    expect(result.projectedScore).toBeLessThan(before)
  })

  it('never mutates the input commitments array', () => {
    const commitments = [
      makeCommitment({ id: 'a', category: 'time', effort_hours: 20, priority: 3, due_at: hoursFromNow(200) }),
    ]
    const snapshot = JSON.parse(JSON.stringify(commitments))
    const loads = categoryLoad(commitments, fullCapacity, NOW)
    rebalance(commitments, loads, NOW)
    expect(commitments).toEqual(snapshot)
  })

  it('never mutates the input loads object', () => {
    const commitments = [makeCommitment({ category: 'time', effort_hours: 20, priority: 3, due_at: hoursFromNow(200) })]
    const loads = categoryLoad(commitments, fullCapacity, NOW)
    const snapshot = { ...loads }
    rebalance(commitments, loads, NOW)
    expect(loads).toEqual(snapshot)
  })
})
