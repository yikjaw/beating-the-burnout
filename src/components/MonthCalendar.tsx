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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeMonth(-1)}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center text-lg text-[var(--color-ink-soft)]"
        >
          ‹
        </button>
        <span className="font-medium">
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => onChangeMonth(1)}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center text-lg text-[var(--color-ink-soft)]"
        >
          ›
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
              className={`relative flex h-11 flex-col items-center justify-center text-sm ${
                isSelected
                  ? 'rounded-lg bg-[var(--color-accent)] font-semibold text-white'
                  : isToday
                    ? 'rounded-lg font-semibold text-[var(--color-accent-strong)]'
                    : 'text-[var(--color-ink)]'
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
