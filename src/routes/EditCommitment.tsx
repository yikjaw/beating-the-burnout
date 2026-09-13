import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { CATEGORY_LABEL } from '../lib/categoryMeta'
import { CATEGORIES, type Category, type Priority } from '../lib/types'

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

export function EditCommitment() {
  const { id } = useParams<{ id: string }>()
  const { commitments, updateCommitment, completeCommitment, reopenCommitment, deleteCommitment } = useAppData()
  const navigate = useNavigate()

  const commitment = commitments.find((c) => c.id === id)

  const [title, setTitle] = useState(commitment?.title ?? '')
  const [category, setCategory] = useState<Category>(commitment?.category ?? 'time')
  const [effortHours, setEffortHours] = useState(commitment?.effort_hours ?? 2)
  const [dueAt, setDueAt] = useState(toDateInputValue(commitment?.due_at ?? null))
  const [priority, setPriority] = useState<Priority>(commitment?.priority ?? 2)
  const [isFlexible, setIsFlexible] = useState(commitment?.is_flexible ?? true)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!commitment) {
    return (
      <div className="flex flex-col gap-4 pt-8 text-center">
        <p className="text-sm text-[var(--color-ink-soft)]">
          That commitment isn't here anymore — it may have already been removed.
        </p>
        <button type="button" onClick={() => navigate('/')} className="btn-primary self-center">
          Back to Home
        </button>
      </div>
    )
  }

  const canSubmit = title.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !id) return
    setSaving(true)
    await updateCommitment(id, {
      title: title.trim(),
      category,
      effort_hours: effortHours,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      priority,
      is_flexible: isFlexible,
    })
    setSaving(false)
    navigate('/')
  }

  async function handleToggleDone() {
    if (!id || !commitment) return
    if (commitment.status === 'done') {
      await reopenCommitment(id)
    } else {
      await completeCommitment(id)
      navigate('/')
    }
  }

  async function handleDelete() {
    if (!id) return
    await deleteCommitment(id)
    navigate('/')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit commitment</h1>

      <button
        type="button"
        onClick={handleToggleDone}
        className={
          commitment.status === 'done' ? 'btn-secondary text-sm' : 'btn text-sm bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]'
        }
      >
        {commitment.status === 'done' ? '✓ Done — tap to reopen' : 'Mark as done'}
      </button>

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="font-medium">
          What is it?
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="field-input"
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
          className="field-input"
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
          How many hours will it take?{' '}
          <span className="font-semibold text-[var(--color-accent-strong)]">{effortHours}h</span>
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
          className="field-input"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium">Priority</legend>
        <div className="flex gap-2">
          {([1, 2, 3] as Priority[]).map((p) => (
            <label key={p} className="chip" data-active={priority === p}>
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

      <label className="card flex min-h-11 items-center justify-between px-4 py-3">
        <span className="font-medium">Flexible — okay to move if things get tight</span>
        <input type="checkbox" checked={isFlexible} onChange={(e) => setIsFlexible(e.target.checked)} />
      </label>

      <button type="submit" disabled={!canSubmit || saving} className="btn-primary">
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      {confirmingDelete ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-flag-soft)] bg-[var(--color-flag-soft)] p-3">
          <p className="text-sm text-[var(--color-ink)]">Delete this for good?</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="btn flex-1 text-sm text-white"
              style={{ backgroundColor: 'var(--color-flag-text)' }}
            >
              Yes, delete
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className="btn-secondary flex-1 text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="btn-danger-quiet"
        >
          Delete
        </button>
      )}
    </form>
  )
}
