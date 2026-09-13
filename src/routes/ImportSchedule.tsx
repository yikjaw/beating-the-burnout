import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { DAYS_OF_WEEK, expandClassToCommitments, extractScheduleFromImage } from '../lib/scheduleImport'
import type { DayOfWeek, DetectedClass } from '../lib/scheduleImport'

const DEFAULT_TERM_WEEKS = 12

interface ReviewRow extends DetectedClass {
  id: string
  recurs: boolean
}

const DAY_LABEL: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function defaultTermStart(): string {
  return toDateInputValue(new Date())
}

function defaultTermEnd(): string {
  const d = new Date()
  d.setDate(d.getDate() + DEFAULT_TERM_WEEKS * 7)
  return toDateInputValue(d)
}

export function ImportSchedule() {
  const { addCommitmentsBulk } = useAppData()
  const navigate = useNavigate()

  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'review'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [termStart, setTermStart] = useState(defaultTermStart())
  const [termEnd, setTermEnd] = useState(defaultTermEnd())
  const [saving, setSaving] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('loading')
    setError(null)

    try {
      const result = await extractScheduleFromImage(file)
      if (result.classes.length === 0) {
        setStatus('error')
        setError("Couldn't find any classes in that image. Try a clearer photo of the timetable.")
        return
      }
      setRows(result.classes.map((c, i) => ({ ...c, id: `${i}-${c.title}`, recurs: true })))
      setStatus('review')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong reading that image.')
    }
  }

  function updateRow(id: string, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const termValid = new Date(termStart).getTime() <= new Date(termEnd).getTime()

  async function handleConfirm() {
    if (rows.length === 0 || !termValid) return

    setSaving(true)
    const allCommitments = rows.flatMap((r) =>
      expandClassToCommitments(r, new Date(termStart), new Date(termEnd), r.recurs),
    )
    await addCommitmentsBulk(allCommitments)
    setSaving(false)
    navigate('/schedule')
  }

  if (status === 'idle' || status === 'loading' || status === 'error') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Import your timetable</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Upload a photo or screenshot of your class schedule. You'll review everything before it's added.
          </p>
        </div>

        <label
          htmlFor="timetable-photo"
          className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-8 text-center"
        >
          <span className="text-sm font-medium text-[var(--color-accent-strong)]">
            {status === 'loading' ? 'Reading your timetable…' : 'Tap to choose a photo'}
          </span>
          <input
            id="timetable-photo"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={status === 'loading'}
            onChange={handleFileChange}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-[var(--color-flag)]">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Check what we found</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Fix anything that's wrong, say when the term runs, and mark anything that isn't a weekly class (like a
          one-off exam) as "Just this once".
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-[var(--color-ink-soft)]">
            From
            <input
              type="date"
              value={termStart}
              onChange={(e) => setTermStart(e.target.value)}
              aria-label="Term start date"
              className="min-h-11 rounded-lg border border-[var(--color-border)] px-2 text-sm text-[var(--color-ink)]"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-[var(--color-ink-soft)]">
            Until
            <input
              type="date"
              value={termEnd}
              onChange={(e) => setTermEnd(e.target.value)}
              aria-label="Term end date"
              className="min-h-11 rounded-lg border border-[var(--color-border)] px-2 text-sm text-[var(--color-ink)]"
            />
          </label>
        </div>
        {!termValid && (
          <p role="alert" className="text-xs text-[var(--color-flag)]">
            The end date needs to be after the start date.
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <input
                type="text"
                value={row.title}
                onChange={(e) => updateRow(row.id, { title: e.target.value })}
                aria-label="Class title"
                className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] px-2 py-2 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                aria-label={`Remove ${row.title}`}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-[var(--color-ink-soft)]"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={row.day_of_week}
                onChange={(e) => updateRow(row.id, { day_of_week: e.target.value as DayOfWeek })}
                aria-label="Day of week"
                className="min-h-11 flex-1 rounded-lg border border-[var(--color-border)] px-2 text-sm"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABEL[d]}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={row.start_time}
                onChange={(e) => updateRow(row.id, { start_time: e.target.value })}
                aria-label="Start time"
                className="min-h-11 rounded-lg border border-[var(--color-border)] px-2 text-sm"
              />
              <input
                type="time"
                value={row.end_time}
                onChange={(e) => updateRow(row.id, { end_time: e.target.value })}
                aria-label="End time"
                className="min-h-11 rounded-lg border border-[var(--color-border)] px-2 text-sm"
              />
            </div>

            <div className="flex gap-2" role="radiogroup" aria-label="Recurrence">
              <button
                type="button"
                role="radio"
                aria-checked={row.recurs}
                onClick={() => updateRow(row.id, { recurs: true })}
                className={`min-h-11 flex-1 rounded-lg border px-2 text-sm font-medium ${
                  row.recurs
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]'
                    : 'border-[var(--color-border)] text-[var(--color-ink-soft)]'
                }`}
              >
                Repeats weekly
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!row.recurs}
                onClick={() => updateRow(row.id, { recurs: false })}
                className={`min-h-11 flex-1 rounded-lg border px-2 text-sm font-medium ${
                  !row.recurs
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]'
                    : 'border-[var(--color-border)] text-[var(--color-ink-soft)]'
                }`}
              >
                Just this once
              </button>
            </div>
          </li>
        ))}
      </ul>

      {rows.length === 0 && <p className="text-sm text-[var(--color-ink-soft)]">Nothing left to add.</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={saving || rows.length === 0 || !termValid}
        className="rounded-xl bg-[var(--color-accent)] px-6 py-4 text-base font-semibold text-white disabled:opacity-40"
      >
        {saving ? 'Adding…' : `Add ${rows.length} ${rows.length === 1 ? 'class' : 'classes'} to schedule`}
      </button>
    </div>
  )
}
