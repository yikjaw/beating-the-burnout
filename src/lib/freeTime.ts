import type { Category, Commitment } from './types'

export interface PreferredActivity {
  name: string
  category: Category
}

export interface FreeSlot {
  startHour: number
  endHour: number
}

export interface ActivitySuggestion {
  slot: FreeSlot
  activity: string
  category: Category
  isNovel: boolean
}

const NOVEL_SUGGESTIONS: { name: string; category: Category }[] = [
  { name: 'Take a 20-minute walk', category: 'physical' },
  { name: 'Try a new recipe', category: 'physical' },
  { name: "Call someone you haven't talked to in a while", category: 'social' },
  { name: 'Do some light stretching', category: 'physical' },
  { name: 'Read for pleasure', category: 'mental' },
  { name: 'Declutter one small space', category: 'errands' },
]

export function parseTimeToHours(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) + (m || 0) / 60
}

/**
 * Free gaps in today's awake window (wake time to bedtime), after
 * subtracting time occupied by today's open commitments. A commitment's
 * occupied window is approximated the same way the day timetable does:
 * ending at its due time and running backward for effort_hours, since the
 * schema only stores a deadline and a duration, not a literal start time.
 */
export function computeFreeSlots(
  commitments: Commitment[],
  wakeTime: string,
  bedtime: string,
  date: Date = new Date(),
  minSlotHours: number = 0.5,
): FreeSlot[] {
  const wake = parseTimeToHours(wakeTime)
  let bed = parseTimeToHours(bedtime)
  if (bed <= wake) bed += 24 // bedtime past midnight

  const busy: FreeSlot[] = []
  for (const c of commitments) {
    if (c.status !== 'open' || !c.due_at) continue
    const due = new Date(c.due_at)
    if (due.toDateString() !== date.toDateString()) continue

    const endHour = Math.min(bed, due.getHours() + due.getMinutes() / 60)
    const startHour = Math.max(wake, endHour - c.effort_hours)
    if (endHour > startHour) busy.push({ startHour, endHour })
  }

  busy.sort((a, b) => a.startHour - b.startHour)

  const free: FreeSlot[] = []
  let cursor = wake
  for (const b of busy) {
    if (b.startHour > cursor) free.push({ startHour: cursor, endHour: b.startHour })
    cursor = Math.max(cursor, b.endHour)
  }
  if (bed > cursor) free.push({ startHour: cursor, endHour: bed })

  return free.filter((s) => s.endHour - s.startHour >= minSlotHours)
}

/**
 * Picks the largest free slot and suggests one activity for it — usually
 * from the user's own preferences, but every third day (a simple
 * deterministic rotation, not real randomness) a novel suggestion outside
 * their usual habits, so the nudge doesn't get stale.
 */
export function recommendActivity(
  slots: FreeSlot[],
  preferredActivities: PreferredActivity[],
  dayIndex: number,
): ActivitySuggestion | null {
  if (slots.length === 0) return null

  const largest = slots.reduce((a, b) => (b.endHour - b.startHour > a.endHour - a.startHour ? b : a))

  const suggestNovel = preferredActivities.length === 0 || dayIndex % 3 === 0
  if (suggestNovel) {
    const pick = NOVEL_SUGGESTIONS[dayIndex % NOVEL_SUGGESTIONS.length]
    return { slot: largest, activity: pick.name, category: pick.category, isNovel: true }
  }

  const pick = preferredActivities[dayIndex % preferredActivities.length]
  return { slot: largest, activity: pick.name, category: pick.category, isNovel: false }
}
