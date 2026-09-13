import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'

function defaultExamDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

export function AddExam() {
  const { addExam } = useAppData()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [examDate, setExamDate] = useState(defaultExamDate())
  const [examTime, setExamTime] = useState('09:00')
  const [examEffortHours, setExamEffortHours] = useState(2)
  const [revisionHoursPerWeek, setRevisionHoursPerWeek] = useState(4)
  const [saving, setSaving] = useState(false)

  const canSubmit = title.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    const examAt = new Date(`${examDate}T${examTime}`).toISOString()
    await addExam({
      title: title.trim(),
      examAt,
      examEffortHours,
      revisionHoursPerWeek,
    })
    setSaving(false)
    navigate('/schedule')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Add an exam</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          We'll put the exam itself on your schedule, and suggest revision blocks in your free time until then.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="exam-title" className="font-medium">
          Exam
        </label>
        <input
          id="exam-title"
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Calculus Final"
          className="field-input"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="exam-date" className="font-medium">
            Date
          </label>
          <input
            id="exam-date"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="field-input"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="exam-time" className="font-medium">
            Time
          </label>
          <input
            id="exam-time"
            type="time"
            value={examTime}
            onChange={(e) => setExamTime(e.target.value)}
            className="field-input"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="exam-duration" className="font-medium">
          How long is the exam?{' '}
          <span className="font-semibold text-[var(--color-accent-strong)]">{examEffortHours}h</span>
        </label>
        <input
          id="exam-duration"
          type="range"
          min={0.5}
          max={4}
          step={0.5}
          value={examEffortHours}
          onChange={(e) => setExamEffortHours(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="revision-hours" className="font-medium">
          Revision hours per week{' '}
          <span className="font-semibold text-[var(--color-accent-strong)]">{revisionHoursPerWeek}h</span>
        </label>
        <p className="text-xs text-[var(--color-ink-soft)]">
          When you've got genuinely free time and haven't hit this yet for the week, Home will suggest a
          revision block for it.
        </p>
        <input
          id="revision-hours"
          type="range"
          min={0}
          max={20}
          step={1}
          value={revisionHoursPerWeek}
          onChange={(e) => setRevisionHoursPerWeek(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
      </div>

      <button type="submit" disabled={!canSubmit || saving} className="btn-primary">
        {saving ? 'Adding…' : 'Add exam'}
      </button>
    </form>
  )
}
