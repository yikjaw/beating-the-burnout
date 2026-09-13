import { describe, expect, it } from 'vitest'
import { computeRecoveryNudge } from './recoveryNudge'
import type { WearableMetric } from './fitbit'
import type { CategoryLoadMap, CheckIn, Commitment } from './types'

const NOW = new Date('2026-09-13T12:00:00') // a Sunday, noon

const LOW_LOADS: CategoryLoadMap = { mental: 0.2, time: 0.3, physical: 0.2, social: 0.2, errands: 0.1 }
const HIGH_LOADS: CategoryLoadMap = { mental: 1.2, time: 1.1, physical: 1.0, social: 0.9, errands: 1.0 }

function wearable(overrides: Partial<WearableMetric> = {}): WearableMetric {
  return {
    logged_on: '2026-09-13',
    resting_heart_rate: 60,
    sleep_minutes: 450,
    sleep_efficiency: 90,
    steps: 5000,
    ...overrides,
  }
}

describe('computeRecoveryNudge', () => {
  it('returns null when nothing warrants a nudge', () => {
    const result = computeRecoveryNudge([], LOW_LOADS, [], wearable(), [], NOW)
    expect(result).toBeNull()
  })

  it('flags poor sleep and suggests protecting tonight', () => {
    const result = computeRecoveryNudge([], LOW_LOADS, [], wearable({ sleep_minutes: 300 }), [], NOW)
    expect(result?.reason).toBe('poor-sleep')
    expect(result?.category).toBe('physical')
    expect(new Date(result!.dueAt).getHours()).toBe(22)
  })

  it('flags an elevated resting heart rate relative to recent baseline', () => {
    const history: WearableMetric[] = [
      wearable({ logged_on: '2026-09-10', resting_heart_rate: 58 }),
      wearable({ logged_on: '2026-09-11', resting_heart_rate: 60 }),
      wearable({ logged_on: '2026-09-12', resting_heart_rate: 59 }),
    ]
    const today = wearable({ resting_heart_rate: 75 }) // well above the ~59 baseline
    const result = computeRecoveryNudge([], LOW_LOADS, [], today, history, NOW)
    expect(result?.reason).toBe('elevated-heart-rate')
  })

  it('does not flag heart rate without an established baseline', () => {
    const result = computeRecoveryNudge([], LOW_LOADS, [], wearable({ resting_heart_rate: 90 }), [], NOW)
    expect(result?.reason).not.toBe('elevated-heart-rate')
  })

  it('flags low activity only once it is evening', () => {
    const morning = new Date('2026-09-13T09:00:00')
    const evening = new Date('2026-09-13T19:00:00')
    const lowSteps = wearable({ steps: 1000 })

    expect(computeRecoveryNudge([], LOW_LOADS, [], lowSteps, [], morning)).toBeNull()
    expect(computeRecoveryNudge([], LOW_LOADS, [], lowSteps, [], evening)?.reason).toBe('low-activity')
  })

  it('falls back to an overload nudge when the schedule itself is the problem', () => {
    const result = computeRecoveryNudge([], HIGH_LOADS, [], null, [], NOW)
    expect(result?.reason).toBe('overload')
  })

  it('falls back to a stress-streak nudge after three high-stress check-ins', () => {
    const checkins: CheckIn[] = [
      { logged_on: '2026-09-11', energy: 2, stress: 4, slept_well: false },
      { logged_on: '2026-09-12', energy: 2, stress: 5, slept_well: false },
      { logged_on: '2026-09-13', energy: 1, stress: 4, slept_well: false },
    ]
    const result = computeRecoveryNudge([], LOW_LOADS, checkins, null, [], NOW)
    expect(result?.reason).toBe('stress-streak')
  })

  it('prioritizes poor sleep over an overloaded schedule', () => {
    const result = computeRecoveryNudge([], HIGH_LOADS, [], wearable({ sleep_minutes: 200 }), [], NOW)
    expect(result?.reason).toBe('poor-sleep')
  })

  it('never mutates the input commitments array', () => {
    const commitments: Commitment[] = [
      {
        id: 'a',
        title: 'Something',
        category: 'time',
        effort_hours: 2,
        due_at: new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 2,
        is_flexible: true,
        status: 'open',
      },
    ]
    const snapshot = JSON.parse(JSON.stringify(commitments))
    computeRecoveryNudge(commitments, HIGH_LOADS, [], null, [], NOW)
    expect(commitments).toEqual(snapshot)
  })
})
