import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Slider } from '../components/Slider'
import { useAppData } from '../context/AppDataContext'
import type { UserPreferences } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORY_LABEL, CATEGORY_PROMPT } from '../lib/categoryMeta'
import { startFitbitConnect } from '../lib/fitbit'
import { CATEGORIES, type CapacityMap, type Category } from '../lib/types'

const ACTIVITY_CATEGORIES: Category[] = ['physical', 'social', 'mental', 'errands']

const DEFAULT_PREFERENCES: UserPreferences = {
  bedtime: '23:00',
  wakeTime: '07:00',
  activities: [],
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

export function Settings() {
  const { user, signOut } = useAuth()
  const {
    capacities,
    setCapacities,
    fitbitConnected,
    wearableMetrics,
    syncingFitbit,
    syncFitbit,
    disconnectFitbit,
    simulateWearableReading,
    preferences,
    setPreferences,
    refresh,
  } = useAppData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [connectError, setConnectError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [capacityDraft, setCapacityDraft] = useState<CapacityMap>(capacities)
  const [savingCapacity, setSavingCapacity] = useState(false)
  const [capacitySaved, setCapacitySaved] = useState(false)
  const [prefsDraft, setPrefsDraft] = useState<UserPreferences>(preferences ?? DEFAULT_PREFERENCES)
  const [newActivityName, setNewActivityName] = useState('')
  const [newActivityCategory, setNewActivityCategory] = useState<Category>('physical')
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)

  useEffect(() => {
    setCapacityDraft(capacities)
  }, [capacities])

  useEffect(() => {
    if (preferences) setPrefsDraft(preferences)
  }, [preferences])

  const fitbitParam = searchParams.get('fitbit')

  useEffect(() => {
    if (!fitbitParam) return
    if (fitbitParam === 'connected') refresh()
    if (fitbitParam === 'error') setConnectError("Couldn't connect Fitbit. Please try again.")
    setSearchParams({}, { replace: true })
  }, [fitbitParam, refresh, setSearchParams])

  const latestMetric = wearableMetrics[wearableMetrics.length - 1] ?? null

  async function handleConnect() {
    setConnectError(null)
    try {
      await startFitbitConnect()
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Could not start Fitbit connection')
    }
  }

  async function handleSync() {
    setSyncMessage(null)
    const result = await syncFitbit()
    setSyncMessage(result.error ?? 'Synced.')
  }

  async function handleSimulate(scenario: 'poor-sleep' | 'elevated-heart-rate') {
    setSimulating(true)
    await simulateWearableReading(scenario)
    setSimulating(false)
  }

  async function handleSaveCapacity() {
    setSavingCapacity(true)
    await setCapacities(capacityDraft)
    setSavingCapacity(false)
    setCapacitySaved(true)
  }

  function handleAddActivity() {
    const name = newActivityName.trim()
    if (!name) return
    setPrefsDraft((prev) => ({
      ...prev,
      activities: [...prev.activities, { name, category: newActivityCategory }],
    }))
    setNewActivityName('')
    setPrefsSaved(false)
  }

  function handleRemoveActivity(index: number) {
    setPrefsDraft((prev) => ({ ...prev, activities: prev.activities.filter((_, i) => i !== index) }))
    setPrefsSaved(false)
  }

  async function handleSavePreferences() {
    setSavingPrefs(true)
    await setPreferences(prefsDraft)
    setSavingPrefs(false)
    setPrefsSaved(true)
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {user?.email && (
        <p className="text-sm text-[var(--color-ink-soft)]">
          Signed in as <span className="font-medium text-[var(--color-ink)]">{user.email}</span>
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--color-ink-soft)]">Weekly capacity</h2>
        <p className="text-xs text-[var(--color-ink-soft)]">
          How many hours a week you realistically have for each area — this is what your load percentage is
          measured against. Change it any time; no need to redo onboarding.
        </p>
        {CATEGORIES.map((category) => (
          <Slider
            key={category}
            id={`settings-capacity-${category}`}
            label={CATEGORY_PROMPT[category]}
            value={capacityDraft[category]}
            min={0}
            max={40}
            unit="h"
            onChange={(value) => {
              setCapacityDraft((prev) => ({ ...prev, [category]: value }))
              setCapacitySaved(false)
            }}
          />
        ))}
        <button
          type="button"
          onClick={handleSaveCapacity}
          disabled={savingCapacity}
          className="rounded-xl bg-[var(--color-accent)] px-6 py-3 text-base font-semibold text-white disabled:opacity-40"
        >
          {savingCapacity ? 'Saving…' : 'Save'}
        </button>
        {capacitySaved && <p className="text-xs text-[var(--color-accent-strong)]">Saved.</p>}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--color-ink-soft)]">Sleep &amp; activities</h2>
        <p className="text-xs text-[var(--color-ink-soft)]">
          Optional — set this up and Home will suggest something to do with genuinely free time in your day,
          based on when you sleep and what you like doing.
        </p>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-[var(--color-ink-soft)]">
            Wake time
            <input
              type="time"
              value={prefsDraft.wakeTime}
              onChange={(e) => {
                setPrefsDraft((prev) => ({ ...prev, wakeTime: e.target.value }))
                setPrefsSaved(false)
              }}
              className="min-h-11 rounded-lg border border-[var(--color-border)] px-2 text-sm text-[var(--color-ink)]"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-[var(--color-ink-soft)]">
            Bedtime
            <input
              type="time"
              value={prefsDraft.bedtime}
              onChange={(e) => {
                setPrefsDraft((prev) => ({ ...prev, bedtime: e.target.value }))
                setPrefsSaved(false)
              }}
              className="min-h-11 rounded-lg border border-[var(--color-border)] px-2 text-sm text-[var(--color-ink)]"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--color-ink)]">Things you like doing</span>
          {prefsDraft.activities.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {prefsDraft.activities.map((activity, i) => (
                <li
                  key={`${activity.name}-${i}`}
                  className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm"
                >
                  {activity.name}
                  <span className="text-[var(--color-ink-soft)]">{CATEGORY_LABEL[activity.category]}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveActivity(i)}
                    aria-label={`Remove ${activity.name}`}
                    className="text-[var(--color-ink-soft)]"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newActivityName}
              onChange={(e) => setNewActivityName(e.target.value)}
              placeholder="e.g. Basketball"
              aria-label="New activity name"
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] px-2 text-sm"
            />
            <select
              value={newActivityCategory}
              onChange={(e) => setNewActivityCategory(e.target.value as Category)}
              aria-label="New activity category"
              className="min-h-11 rounded-lg border border-[var(--color-border)] px-2 text-sm"
            >
              {ACTIVITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddActivity}
              className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm font-medium text-[var(--color-accent-strong)]"
            >
              Add
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSavePreferences}
          disabled={savingPrefs}
          className="rounded-xl bg-[var(--color-accent)] px-6 py-3 text-base font-semibold text-white disabled:opacity-40"
        >
          {savingPrefs ? 'Saving…' : 'Save'}
        </button>
        {prefsSaved && <p className="text-xs text-[var(--color-accent-strong)]">Saved.</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--color-ink-soft)]">Wearable</h2>

        {fitbitConnected ? (
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <p className="text-sm font-medium text-[var(--color-accent-strong)]">Fitbit connected</p>

            {latestMetric && (
              <p className="text-sm text-[var(--color-ink-soft)]">
                Last synced ({latestMetric.logged_on}): resting HR{' '}
                {latestMetric.resting_heart_rate ?? '—'} bpm, slept {formatMinutes(latestMetric.sleep_minutes)}
                {latestMetric.sleep_efficiency !== null ? ` (${latestMetric.sleep_efficiency}% efficiency)` : ''},{' '}
                {latestMetric.steps?.toLocaleString() ?? '—'} steps
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSync}
                disabled={syncingFitbit}
                className="min-h-11 flex-1 rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                {syncingFitbit ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                type="button"
                onClick={disconnectFitbit}
                className="min-h-11 flex-1 rounded-lg border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-ink)]"
              >
                Disconnect
              </button>
            </div>

            {syncMessage && <p className="text-xs text-[var(--color-ink-soft)]">{syncMessage}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleConnect}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-6 py-3 text-base font-medium text-[var(--color-accent-strong)]"
            >
              Connect Fitbit
            </button>
            <p className="text-xs text-[var(--color-ink-soft)]">
              Lets us read your sleep, heart rate, and step count — nothing is shared anywhere else. When it
              shows something's off, we'll suggest protecting real time on your schedule for it.
            </p>
            {connectError && (
              <p role="alert" className="text-sm text-[var(--color-flag)]">
                {connectError}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-ink-soft)]">Demo: simulate a reading</h2>
        <p className="text-xs text-[var(--color-ink-soft)]">
          No wearable? Write a fake-but-clearly-fake data point so you can see the schedule respond, without
          needing a real device.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSimulate('poor-sleep')}
            disabled={simulating}
            className="min-h-11 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-medium text-[var(--color-ink)] disabled:opacity-40"
          >
            Simulate poor sleep
          </button>
          <button
            type="button"
            onClick={() => handleSimulate('elevated-heart-rate')}
            disabled={simulating}
            className="min-h-11 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-medium text-[var(--color-ink)] disabled:opacity-40"
          >
            Simulate high heart rate
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={signOut}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-6 py-3 text-base font-medium text-[var(--color-ink)]"
      >
        Sign out
      </button>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-ink-soft)]">Support</h2>
        <a
          href="/campus-support"
          className="text-sm text-[var(--color-ink-soft)] underline decoration-[var(--color-border)] underline-offset-2 hover:text-[var(--color-ink)]"
        >
          Campus support services
        </a>
      </section>
    </div>
  )
}
