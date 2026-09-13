import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { CATEGORY_LABEL } from '../lib/categoryMeta'
import { CATEGORIES, type Category, type Priority } from '../lib/types'

function defaultDueAt(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export function AddCommitment() {
  const { addCommitment } = useAppData()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('time')
  const [effortHours, setEffortHours] = useState(2)
  const [dueAt, setDueAt] = useState(defaultDueAt())
  const [priority, setPriority] = useState<Priority>(2)
  const [isFlexible, setIsFlexible] = useState(true)

  const canSubmit = title.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await addCommitment({
      title: title.trim(),
      category,
      effort_hours: effortHours,
      due_at: new Date(dueAt).toISOString(),
      priority,
      is_flexible: isFlexible,
    })
    navigate('/')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add something</h1>

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="font-medium">
          What is it?
        </label>
        <input
          id="title"
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Read chapter 6"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="category" className="font-medium">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-base"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="effort" className="font-medium">
          How many hours will it take? <span className="font-semibold text-[var(--color-accent-strong)]">{effortHours}h</span>
        </label>
        <input
          id="effort"
          type="range"
          min={0.5}
          max={20}
          step={0.5}
          value={effortHours}
          onChange={(e) => setEffortHours(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="due" className="font-medium">
          Due
        </label>
        <input
          id="due"
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-base"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium">Priority</legend>
        <div className="flex gap-2">
          {([1, 2, 3] as Priority[]).map((p) => (
            <label
              key={p}
              className={`flex flex-1 min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm ${
                priority === p
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-semibold'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-raised)]'
              }`}
            >
              <input
                type="radio"
                name="priority"
                value={p}
                checked={priority === p}
                onChange={() => setPriority(p)}
                className="sr-only"
              />
              {p === 1 ? 'High' : p === 2 ? 'Medium' : 'Low'}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-11 items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5">
        <span className="font-medium">Flexible — okay to move if things get tight</span>
        <input
          type="checkbox"
          checked={isFlexible}
          onChange={(e) => setIsFlexible(e.target.checked)}
          className="h-5 w-5 accent-[var(--color-accent)]"
        />
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-xl bg-[var(--color-accent)] px-6 py-3 text-base font-semibold text-white disabled:opacity-40"
      >
        Add
      </button>
    </form>
  )
}
