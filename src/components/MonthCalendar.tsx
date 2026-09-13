import { ChevronLeftIcon, ChevronRightIcon } from './icons'

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface MonthCalendarProps {
  viewMonth: Date
  selectedDate: Date
  markedDates: Set<string>
  onSelectDate: (date: Date) => void
  onChangeMonth: (delta: number) => void
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function MonthCalendar({ viewMonth, selectedDate, markedDates, onSelectDate, onChangeMonth }: MonthCalendarProps) {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = firstOfMonth.getDay()
  const today = new Date()

  const cells: (Date | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeMonth(-1)}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-sunken)]"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="font-semibold">
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => onChangeMonth(1)}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-sunken)]"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-[var(--color-ink-soft)]">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />

          const isSelected = isSameDay(date, selectedDate)
          const isToday = isSameDay(date, today)
          const isMarked = markedDates.has(date.toDateString())

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-label={date.toDateString() + (isMarked ? ', has items due' : '')}
              aria-current={isToday ? 'date' : undefined}
              className={`relative flex h-11 flex-col items-center justify-center text-sm transition-colors ${
                isSelected
                  ? 'rounded-full bg-[var(--color-accent)] font-semibold text-white shadow-[var(--shadow-sm)]'
                  : isToday
                    ? 'rounded-full font-semibold text-[var(--color-accent-strong)] ring-1 ring-inset ring-[var(--color-accent-soft)]'
                    : 'rounded-full text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]'
              }`}
            >
              {date.getDate()}
              {isMarked && !isSelected && (
                <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
