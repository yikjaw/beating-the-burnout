import { CATEGORY_LABEL } from '../lib/categoryMeta'
import { DAY_WINDOW_END, DAY_WINDOW_START, formatHourLabel, timeBlockForCommitment } from '../lib/scheduleGrid'
import type { Commitment } from '../lib/types'

const HOUR_HEIGHT_PX = 48

interface DayTimetableProps {
  commitments: Commitment[]
}

export function DayTimetable({ commitments }: DayTimetableProps) {
  const blocks = commitments
    .map((c) => timeBlockForCommitment(c))
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .sort((a, b) => a.startHour - b.startHour)

  const hours = Array.from({ length: DAY_WINDOW_END - DAY_WINDOW_START + 1 }, (_, i) => DAY_WINDOW_START + i)
  const totalHeight = (DAY_WINDOW_END - DAY_WINDOW_START) * HOUR_HEIGHT_PX

  if (blocks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-ink-soft)]">Nothing scheduled — enjoy the space.</p>
    )
  }

  return (
    <div className="relative flex" style={{ height: totalHeight }}>
      <div className="w-12 flex-shrink-0">
        {hours.map((hour) => (
          <div
            key={hour}
            className="text-right text-xs text-[var(--color-ink-soft)]"
            style={{ height: HOUR_HEIGHT_PX, paddingRight: 8 }}
          >
            {formatHourLabel(hour)}
          </div>
        ))}
      </div>

      <div className="relative flex-1 border-l border-[var(--color-border)]">
        {hours.map((hour) => (
          <div
            key={hour}
            className="border-t border-[var(--color-border)]"
            style={{ height: HOUR_HEIGHT_PX }}
            aria-hidden="true"
          />
        ))}

        {blocks.map(({ commitment, startHour, endHour }) => {
          const top = (startHour - DAY_WINDOW_START) * HOUR_HEIGHT_PX
          const height = Math.max(20, (endHour - startHour) * HOUR_HEIGHT_PX - 2)

          return (
            <div
              key={commitment.id}
              className="absolute left-1 right-1 overflow-hidden rounded-md border-l-4 border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-2 py-1 text-xs"
              style={{ top, height }}
            >
              <p className="truncate font-medium text-[var(--color-ink)]">{commitment.title}</p>
              <p className="truncate text-[var(--color-ink-soft)]">
                {CATEGORY_LABEL[commitment.category]} · {formatHourLabel(startHour)}–{formatHourLabel(endHour)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
