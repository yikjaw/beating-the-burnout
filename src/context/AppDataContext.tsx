import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { CATEGORIES, type CapacityMap, type CheckIn, type Commitment } from '../lib/types'
import { supabase } from '../lib/supabaseClient'
import type { Json } from '../lib/database.types'
import type { WearableMetric } from '../lib/fitbit'
import type { PreferredActivity } from '../lib/freeTime'
import type { RebalanceMove } from '../lib/scoring'

export interface UserPreferences {
  bedtime: string
  wakeTime: string
  activities: PreferredActivity[]
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
  simulateWearableReading: (scenario: 'poor-sleep' | 'elevated-heart-rate') => Promise<void>
  preferences: UserPreferences | null
  setPreferences: (prefs: UserPreferences) => Promise<void>
  refresh: () => Promise<void>
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
  const [preferences, setPreferencesState] = useState<UserPreferences | null>(null)

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
      setLoading(false)
      return
    }

    setLoading(true)

    const [profileRes, capacitiesRes, commitmentsRes, checkinsRes, fitbitRes, wearableRes, preferencesRes] =
      await Promise.all([
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

    setCommitments(
      (commitmentsRes.data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        effort_hours: row.effort_hours,
        due_at: row.due_at,
        priority: row.priority as Commitment['priority'],
        is_flexible: row.is_flexible,
        status: row.status as Commitment['status'],
        deferred_to: row.deferred_to,
      })),
    )

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
    setCommitments((prev) => [
      ...prev,
      {
        id: data.id,
        title: data.title,
        category: data.category,
        effort_hours: data.effort_hours,
        due_at: data.due_at,
        priority: data.priority as Commitment['priority'],
        is_flexible: data.is_flexible,
        status: data.status as Commitment['status'],
        deferred_to: data.deferred_to,
      },
    ])
  }

  async function addCommitmentsBulk(inputs: NewCommitmentInput[]) {
    if (!user || inputs.length === 0) return
    const { data, error } = await supabase
      .from('commitments')
      .insert(inputs.map((input) => ({ user_id: user.id, status: 'open' as const, ...input })))
      .select()
    if (error || !data) return
    setCommitments((prev) => [
      ...prev,
      ...data.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        effort_hours: row.effort_hours,
        due_at: row.due_at,
        priority: row.priority as Commitment['priority'],
        is_flexible: row.is_flexible,
        status: row.status as Commitment['status'],
        deferred_to: row.deferred_to,
      })),
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
    setCheckins((prev) => [...prev.filter((c) => c.logged_on !== today), { logged_on: today, ...input }])
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

  const value: AppDataValue = {
    loading,
    hasOnboarded,
    capacities,
    setCapacities,
    commitments,
    addCommitment,
    addCommitmentsBulk,
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
    simulateWearableReading,
    preferences,
    setPreferences,
    refresh: loadAll,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
