import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { CATEGORIES, type CapacityMap, type CheckIn, type Commitment } from '../lib/types'
import { supabase } from '../lib/supabaseClient'
import type { Json } from '../lib/database.types'
import type { WearableMetric } from '../lib/fitbit'
import type { Exam } from '../lib/examRevision'
import type { PreferredActivity } from '../lib/freeTime'
import { categoryLoad, overallCapacity } from '../lib/scoring'
import type { RebalanceMove } from '../lib/scoring'

export interface NewExamInput {
  title: string
  examAt: string
  revisionHoursPerWeek: number
  examEffortHours: number
}

export interface UserPreferences {
  bedtime: string
  wakeTime: string
  activities: PreferredActivity[]
}

export interface LoadSnapshot {
  logged_on: string
  overall_percentage: number
}

export interface NewCommitmentInput {
  title: string
  category: Commitment['category']
  effort_hours: number
  due_at: string | null
  priority: Commitment['priority']
  is_flexible: boolean
}

export interface NewCheckInInput {
  energy: number
  stress: number
  slept_well: boolean
}

interface AppDataValue {
  loading: boolean
  hasOnboarded: boolean
  capacities: CapacityMap
  setCapacities: (capacities: CapacityMap) => Promise<void>
  commitments: Commitment[]
  addCommitment: (input: NewCommitmentInput) => Promise<void>
  addCommitmentsBulk: (inputs: NewCommitmentInput[]) => Promise<void>
  updateCommitment: (id: string, patch: Partial<NewCommitmentInput>) => Promise<void>
  completeCommitment: (id: string) => Promise<void>
  reopenCommitment: (id: string) => Promise<void>
  deleteCommitment: (id: string) => Promise<void>
  deferCommitments: (moves: RebalanceMove[]) => Promise<void>
  logRebalanceSuggestion: (moves: RebalanceMove[], accepted: boolean) => Promise<void>
  logRecoverySuggestion: (payload: Record<string, unknown>, accepted: boolean) => Promise<void>
  checkins: CheckIn[]
  addCheckIn: (input: NewCheckInInput) => Promise<void>
  fitbitConnected: boolean
  wearableMetrics: WearableMetric[]
  syncingFitbit: boolean
  syncFitbit: () => Promise<{ error: string | null }>
  disconnectFitbit: () => Promise<void>
  syncingCalendar: boolean
  syncGoogleCalendar: () => Promise<{ error: string | null; synced?: number; failed?: number }>
  simulateWearableReading: (scenario: 'poor-sleep' | 'elevated-heart-rate') => Promise<void>
  preferences: UserPreferences | null
  setPreferences: (prefs: UserPreferences) => Promise<void>
  loadSnapshots: LoadSnapshot[]
  exams: Exam[]
  addExam: (input: NewExamInput) => Promise<void>
  loadDemoData: () => Promise<void>
  refresh: () => Promise<void>
}

function mapCommitmentRow(row: {
  id: string
  title: string
  category: Commitment['category']
  effort_hours: number
  due_at: string | null
  priority: number
  is_flexible: boolean
  status: string
  deferred_to: string | null
}): Commitment {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    effort_hours: row.effort_hours,
    due_at: row.due_at,
    priority: row.priority as Commitment['priority'],
    is_flexible: row.is_flexible,
    status: row.status as Commitment['status'],
    deferred_to: row.deferred_to,
  }
}

const EMPTY_CAPACITIES: CapacityMap = {
  mental: 0,
  time: 0,
  physical: 0,
  social: 0,
  errands: 0,
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [capacities, setCapacitiesState] = useState<CapacityMap>(EMPTY_CAPACITIES)
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [fitbitConnected, setFitbitConnected] = useState(false)
  const [wearableMetrics, setWearableMetrics] = useState<WearableMetric[]>([])
  const [syncingFitbit, setSyncingFitbit] = useState(false)
  const [syncingCalendar, setSyncingCalendar] = useState(false)
  const [preferences, setPreferencesState] = useState<UserPreferences | null>(null)
  const [loadSnapshots, setLoadSnapshots] = useState<LoadSnapshot[]>([])
  const [exams, setExams] = useState<Exam[]>([])

  const loadAll = useCallback(async () => {
    // Auth hasn't resolved yet — `user` being null right now doesn't mean
    // logged out, it might just not have loaded. Stay in a loading state
    // rather than locking in "not onboarded" from a momentarily-null user.
    if (authLoading) return

    if (!user) {
      setCapacitiesState(EMPTY_CAPACITIES)
      setCommitments([])
      setCheckins([])
      setFitbitConnected(false)
      setWearableMetrics([])
      setHasOnboarded(false)
      setPreferencesState(null)
      setLoadSnapshots([])
      setExams([])
      setLoading(false)
      return
    }

    setLoading(true)

    const [
      profileRes,
      capacitiesRes,
      commitmentsRes,
      checkinsRes,
      fitbitRes,
      wearableRes,
      preferencesRes,
      snapshotsRes,
      examsRes,
    ] = await Promise.all([
        supabase.from('profiles').select('id').eq('id', user.id).maybeSingle(),
        supabase.from('capacities').select('category, weekly_hours').eq('user_id', user.id),
        supabase.from('commitments').select('*').eq('user_id', user.id).order('due_at', { ascending: true }),
        supabase
          .from('checkins')
          .select('logged_on, energy, stress, slept_well')
          .eq('user_id', user.id)
          .order('logged_on', { ascending: true })
          .limit(30),
        supabase.from('fitbit_connections').select('user_id').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('wearable_metrics')
          .select('logged_on, resting_heart_rate, sleep_minutes, sleep_efficiency, steps')
          .eq('user_id', user.id)
          .order('logged_on', { ascending: true })
          .limit(30),
        supabase.from('user_preferences').select('bedtime, wake_time, activities').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('load_snapshots')
          .select('logged_on, overall_percentage')
          .eq('user_id', user.id)
          .order('logged_on', { ascending: true })
          .limit(30),
        supabase
          .from('exams')
          .select('id, title, exam_at, revision_hours_per_week')
          .eq('user_id', user.id)
          .order('exam_at', { ascending: true }),
      ])

    if (!profileRes.data) {
      await supabase.from('profiles').insert({
        id: user.id,
        display_name: user.email?.split('@')[0] ?? 'Student',
      })
    }

    const nextCapacities: CapacityMap = { ...EMPTY_CAPACITIES }
    for (const row of capacitiesRes.data ?? []) {
      nextCapacities[row.category] = row.weekly_hours
    }
    setCapacitiesState(nextCapacities)
    setHasOnboarded((capacitiesRes.data?.length ?? 0) === CATEGORIES.length)

    setCommitments((commitmentsRes.data ?? []).map(mapCommitmentRow))

    setCheckins(checkinsRes.data ?? [])
    setFitbitConnected(!!fitbitRes.data)
    setWearableMetrics(wearableRes.data ?? [])
    setPreferencesState(
      preferencesRes.data
        ? {
            bedtime: preferencesRes.data.bedtime,
            wakeTime: preferencesRes.data.wake_time,
            activities: (preferencesRes.data.activities as unknown as PreferredActivity[]) ?? [],
          }
        : null,
    )
    setLoadSnapshots(snapshotsRes.data ?? [])
    setExams(
      (examsRes.data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        examAt: row.exam_at,
        revisionHoursPerWeek: row.revision_hours_per_week,
      })),
    )
    setLoading(false)
  }, [user, authLoading])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function setCapacities(next: CapacityMap) {
    if (!user) return
    const rows = CATEGORIES.map((category) => ({
      user_id: user.id,
      category,
      weekly_hours: next[category],
    }))
    await supabase.from('capacities').upsert(rows, { onConflict: 'user_id,category' })
    setCapacitiesState(next)
    setHasOnboarded(true)
  }

  async function addCommitment(input: NewCommitmentInput) {
    if (!user) return
    const { data, error } = await supabase
      .from('commitments')
      .insert({ user_id: user.id, status: 'open', ...input })
      .select()
      .single()
    if (error || !data) return
    setCommitments((prev) => [...prev, mapCommitmentRow(data)])
  }

  async function addCommitmentsBulk(inputs: NewCommitmentInput[]) {
    if (!user || inputs.length === 0) return
    const { data, error } = await supabase
      .from('commitments')
      .insert(inputs.map((input) => ({ user_id: user.id, status: 'open' as const, ...input })))
      .select()
    if (error || !data) return
    setCommitments((prev) => [...prev, ...data.map(mapCommitmentRow)])
  }

  async function updateCommitment(id: string, patch: Partial<NewCommitmentInput>) {
    if (!user) return
    const { data, error } = await supabase
      .from('commitments')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error || !data) return
    const updated = mapCommitmentRow(data)
    setCommitments((prev) => prev.map((c) => (c.id === id ? updated : c)))
  }

  async function completeCommitment(id: string) {
    if (!user) return
    const { error } = await supabase
      .from('commitments')
      .update({ status: 'done' })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return
    setCommitments((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'done' } : c)))
  }

  async function reopenCommitment(id: string) {
    if (!user) return
    const { error } = await supabase
      .from('commitments')
      .update({ status: 'open' })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return
    setCommitments((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'open' } : c)))
  }

  async function deleteCommitment(id: string) {
    if (!user) return
    const { error } = await supabase.from('commitments').delete().eq('id', id).eq('user_id', user.id)
    if (error) return
    setCommitments((prev) => prev.filter((c) => c.id !== id))
  }

  async function addExam(input: NewExamInput) {
    if (!user) return

    // The exam sitting itself is a real, fixed commitment — it shows on the
    // schedule and can sync to Google Calendar like anything else.
    await addCommitment({
      title: input.title,
      category: 'mental',
      effort_hours: input.examEffortHours,
      due_at: input.examAt,
      priority: 1,
      is_flexible: false,
    })

    const { data, error } = await supabase
      .from('exams')
      .insert({
        user_id: user.id,
        title: input.title,
        exam_at: input.examAt,
        revision_hours_per_week: input.revisionHoursPerWeek,
      })
      .select('id, title, exam_at, revision_hours_per_week')
      .single()

    if (error || !data) return
    setExams((prev) => [
      ...prev,
      { id: data.id, title: data.title, examAt: data.exam_at, revisionHoursPerWeek: data.revision_hours_per_week },
    ])
  }

  async function deferCommitments(moves: RebalanceMove[]) {
    if (!user || moves.length === 0) return
    await Promise.all(
      moves.map((m) =>
        supabase
          .from('commitments')
          .update({ status: 'deferred', deferred_to: m.deferredTo })
          .eq('id', m.commitmentId)
          .eq('user_id', user.id),
      ),
    )
    setCommitments((prev) =>
      prev.map((c) => {
        const move = moves.find((m) => m.commitmentId === c.id)
        if (!move) return c
        return { ...c, status: 'deferred', deferred_to: move.deferredTo }
      }),
    )
  }

  async function logRebalanceSuggestion(moves: RebalanceMove[], accepted: boolean) {
    if (!user) return
    await supabase.from('suggestions').insert({
      user_id: user.id,
      kind: 'rebalance',
      payload: { moves } as unknown as Json,
      accepted,
    })
  }

  async function logRecoverySuggestion(payload: Record<string, unknown>, accepted: boolean) {
    if (!user) return
    await supabase.from('suggestions').insert({
      user_id: user.id,
      kind: 'recovery',
      payload: payload as unknown as Json,
      accepted,
    })
  }

  async function addCheckIn(input: NewCheckInInput) {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('checkins').upsert(
      { user_id: user.id, logged_on: today, ...input },
      { onConflict: 'user_id,logged_on' },
    )
    const nextCheckins = [...checkins.filter((c) => c.logged_on !== today), { logged_on: today, ...input }]
    setCheckins(nextCheckins)

    // Capture today's real load percentage so Trends can plot actual
    // history instead of approximating it from today's numbers later.
    const loads = categoryLoad(commitments, capacities)
    const { percentage } = overallCapacity(loads, nextCheckins.slice(-3))
    const roundedPercentage = Math.round(percentage * 1000) / 1000
    await supabase.from('load_snapshots').upsert(
      {
        user_id: user.id,
        logged_on: today,
        overall_percentage: roundedPercentage,
        category_loads: loads as unknown as Json,
      },
      { onConflict: 'user_id,logged_on' },
    )
    setLoadSnapshots((prev) => [
      ...prev.filter((s) => s.logged_on !== today),
      { logged_on: today, overall_percentage: roundedPercentage },
    ])
  }

  async function syncFitbit(): Promise<{ error: string | null }> {
    if (!user) return { error: 'Not signed in' }
    setSyncingFitbit(true)
    const { data, error } = await supabase.functions.invoke<WearableMetric & { error?: string }>('fitbit-sync')
    setSyncingFitbit(false)

    if (error) return { error: 'Failed to reach Fitbit sync' }
    if (!data || data.error) return { error: data?.error ?? 'Failed to sync Fitbit data' }

    setWearableMetrics((prev) => [...prev.filter((m) => m.logged_on !== data.logged_on), data])
    return { error: null }
  }

  async function disconnectFitbit() {
    if (!user) return
    await supabase.from('fitbit_connections').delete().eq('user_id', user.id)
    setFitbitConnected(false)
  }

  async function syncGoogleCalendar(): Promise<{ error: string | null; synced?: number; failed?: number }> {
    if (!user) return { error: 'Not signed in' }
    setSyncingCalendar(true)
    const { data, error } = await supabase.functions.invoke<{ synced: number; failed: number; error?: string }>(
      'calendar-sync',
    )
    setSyncingCalendar(false)

    if (error) return { error: 'Failed to reach calendar sync' }
    if (!data || data.error) return { error: data?.error ?? 'Failed to sync to Google Calendar' }

    return { error: null, synced: data.synced, failed: data.failed }
  }

  /** Writes fake-but-clearly-fake wearable data directly, bypassing any real device or API, so the data-driven nudges can be demoed without a physical wearable. */
  async function simulateWearableReading(scenario: 'poor-sleep' | 'elevated-heart-rate') {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    if (scenario === 'poor-sleep') {
      await supabase.from('wearable_metrics').upsert(
        {
          user_id: user.id,
          logged_on: today,
          resting_heart_rate: 60,
          sleep_minutes: 300,
          sleep_efficiency: 78,
          steps: null,
          source: 'fitbit',
        },
        { onConflict: 'user_id,logged_on,source' },
      )
    } else {
      await supabase.from('wearable_metrics').upsert(
        {
          user_id: user.id,
          logged_on: yesterday,
          resting_heart_rate: 58,
          sleep_minutes: 450,
          sleep_efficiency: 90,
          steps: null,
          source: 'fitbit',
        },
        { onConflict: 'user_id,logged_on,source' },
      )
      await supabase.from('wearable_metrics').upsert(
        {
          user_id: user.id,
          logged_on: today,
          resting_heart_rate: 82,
          sleep_minutes: 450,
          sleep_efficiency: 90,
          steps: null,
          source: 'fitbit',
        },
        { onConflict: 'user_id,logged_on,source' },
      )
    }

    await loadAll()
  }

  async function setPreferences(prefs: UserPreferences) {
    if (!user) return
    await supabase.from('user_preferences').upsert({
      user_id: user.id,
      bedtime: prefs.bedtime,
      wake_time: prefs.wakeTime,
      activities: prefs.activities as unknown as Json,
    })
    setPreferencesState(prefs)
  }

  /**
   * Populates a fresh account with a realistic, reliably-overloaded week —
   * commitments, capacities, and a rising-stress check-in history — so the
   * balancer and recovery nudges have something to show without manually
   * building up a week's worth of data first. Additive: doesn't touch
   * anything that already exists.
   */
  async function loadDemoData() {
    if (!user) return

    const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const demoCapacities: CapacityMap = { mental: 15, time: 20, physical: 6, social: 8, errands: 5 }
    await setCapacities(demoCapacities)

    await addCommitmentsBulk([
      { title: 'Read chapter 6', category: 'mental', effort_hours: 4, due_at: inDays(6), priority: 3, is_flexible: true },
      { title: 'Stats problem set', category: 'time', effort_hours: 6, due_at: inDays(1.5), priority: 1, is_flexible: false },
      { title: 'Group project draft', category: 'time', effort_hours: 8, due_at: inDays(2), priority: 1, is_flexible: false },
      { title: 'Grocery run', category: 'errands', effort_hours: 2, due_at: inDays(4), priority: 3, is_flexible: true },
      { title: 'Laundry', category: 'errands', effort_hours: 1.5, due_at: inDays(3), priority: 2, is_flexible: true },
      { title: 'Gym sessions', category: 'physical', effort_hours: 3, due_at: inDays(7), priority: 2, is_flexible: true },
      { title: 'Call parents', category: 'social', effort_hours: 1, due_at: inDays(5), priority: 3, is_flexible: true },
      { title: 'Part-time shift', category: 'time', effort_hours: 12, due_at: inDays(1), priority: 1, is_flexible: false },
    ])

    const demoCheckins = [
      { logged_on: daysAgo(6), energy: 3, stress: 3, slept_well: true },
      { logged_on: daysAgo(5), energy: 3, stress: 3, slept_well: true },
      { logged_on: daysAgo(4), energy: 2, stress: 4, slept_well: false },
      { logged_on: daysAgo(3), energy: 2, stress: 4, slept_well: false },
      { logged_on: daysAgo(2), energy: 2, stress: 4, slept_well: false },
      { logged_on: daysAgo(1), energy: 2, stress: 5, slept_well: false },
      { logged_on: daysAgo(0), energy: 1, stress: 5, slept_well: false },
    ]
    await Promise.all(
      demoCheckins.map((c) =>
        supabase.from('checkins').upsert({ user_id: user.id, ...c }, { onConflict: 'user_id,logged_on' }),
      ),
    )

    // Backfill a rising load trend alongside the rising stress above. We
    // don't have real historical booked-hours to compute this from, so it's
    // an illustrative ramp toward today's real (now-overloaded) percentage
    // — clearly a demo, not a claim of real history.
    const demoCommitments: Commitment[] = [
      { id: 'd1', title: 'Read chapter 6', category: 'mental', effort_hours: 4, due_at: inDays(6), priority: 3, is_flexible: true, status: 'open' },
      { id: 'd2', title: 'Stats problem set', category: 'time', effort_hours: 6, due_at: inDays(1.5), priority: 1, is_flexible: false, status: 'open' },
      { id: 'd3', title: 'Group project draft', category: 'time', effort_hours: 8, due_at: inDays(2), priority: 1, is_flexible: false, status: 'open' },
      { id: 'd4', title: 'Grocery run', category: 'errands', effort_hours: 2, due_at: inDays(4), priority: 3, is_flexible: true, status: 'open' },
      { id: 'd5', title: 'Laundry', category: 'errands', effort_hours: 1.5, due_at: inDays(3), priority: 2, is_flexible: true, status: 'open' },
      { id: 'd6', title: 'Gym sessions', category: 'physical', effort_hours: 3, due_at: inDays(7), priority: 2, is_flexible: true, status: 'open' },
      { id: 'd7', title: 'Call parents', category: 'social', effort_hours: 1, due_at: inDays(5), priority: 3, is_flexible: true, status: 'open' },
      { id: 'd8', title: 'Part-time shift', category: 'time', effort_hours: 12, due_at: inDays(1), priority: 1, is_flexible: false, status: 'open' },
    ]
    const demoLoads = categoryLoad(demoCommitments, demoCapacities)
    const { percentage: todayPercentage } = overallCapacity(demoLoads, [])
    const rampFactors = [0.52, 0.6, 0.68, 0.77, 0.86, 0.94, 1.0]

    await Promise.all(
      rampFactors.map((factor, i) =>
        supabase.from('load_snapshots').upsert(
          {
            user_id: user.id,
            logged_on: daysAgo(6 - i),
            overall_percentage: Math.round(todayPercentage * factor * 1000) / 1000,
            category_loads: demoLoads as unknown as Json,
          },
          { onConflict: 'user_id,logged_on' },
        ),
      ),
    )

    await loadAll()
  }

  const value: AppDataValue = {
    loading,
    hasOnboarded,
    capacities,
    setCapacities,
    commitments,
    addCommitment,
    addCommitmentsBulk,
    updateCommitment,
    completeCommitment,
    reopenCommitment,
    deleteCommitment,
    deferCommitments,
    logRebalanceSuggestion,
    logRecoverySuggestion,
    checkins,
    addCheckIn,
    fitbitConnected,
    wearableMetrics,
    syncingFitbit,
    syncFitbit,
    disconnectFitbit,
    syncingCalendar,
    syncGoogleCalendar,
    simulateWearableReading,
    preferences,
    setPreferences,
    loadSnapshots,
    exams,
    addExam,
    loadDemoData,
    refresh: loadAll,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
