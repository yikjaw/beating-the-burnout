import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DayTimetable } from '../components/DayTimetable'
import { MonthCalendar } from '../components/MonthCalendar'
import { useAppData } from '../context/AppDataContext'
import { commitmentsOnDate, datesWithCommitments } from '../lib/scheduleGrid'

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function Schedule() {
  const { commitments } = useAppData()
  const today = useMemo(() => new Date(), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [viewMonth, setViewMonth] = useState(startOfMonth(today))

  const markedDates = useMemo(() => datesWithCommitments(commitments), [commitments])
  const dayCommitments = useMemo(() => commitmentsOnDate(commitments, selectedDate), [commitments, selectedDate])

  function handleChangeMonth(delta: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(date)
    if (date.getMonth() !== viewMonth.getMonth() || date.getFullYear() !== viewMonth.getFullYear()) {
      setViewMonth(startOfMonth(date))
    }
  }

  const isToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Schedule</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Deadlines shown as time blocks — an estimate of when the work needs to happen, not a fixed appointment.
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <Link to="/add-exam" className="btn-secondary px-3 text-sm text-[var(--color-accent-strong)]">
            + Exam
          </Link>
          <Link to="/import-schedule" className="btn-secondary px-3 text-sm text-[var(--color-accent-strong)]">
            Import
          </Link>
        </div>
      </div>

      <MonthCalendar
        viewMonth={viewMonth}
        selectedDate={selectedDate}
        markedDates={markedDates}
        onSelectDate={handleSelectDate}
        onChangeMonth={handleChangeMonth}
      />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink-soft)]">
          {isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </h2>
        <DayTimetable commitments={dayCommitments} />
      </div>
    </div>
  )
}
