import { supabase } from './supabaseClient'
import type { NewCommitmentInput } from '../context/AppDataContext'

export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

export interface DetectedClass {
  title: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
}

export interface ExtractScheduleResult {
  classes: DetectedClass[]
}

const DAY_INDEX: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const MIN_EFFORT_HOURS = 0.25

export async function extractScheduleFromImage(file: File): Promise<ExtractScheduleResult> {
  const base64 = await fileToBase64(file)

  const { data, error } = await supabase.functions.invoke<ExtractScheduleResult & { error?: string }>(
    'extract-schedule',
    { body: { image_base64: base64, media_type: file.type } },
  )

  if (error) throw new Error('Failed to reach the schedule import service')
  if (!data || data.error) throw new Error(data?.error ?? 'Failed to extract a schedule from that image')

  return data
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function parseHoursMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) + (m || 0) / 60
}

function nextDateOnOrAfter(from: Date, weekday: number): Date {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const diff = (weekday - date.getDay() + 7) % 7
  date.setDate(date.getDate() + diff)
  return date
}

/**
 * Turns one detected class into commitment rows, since the schema has no
 * native recurrence. When `recurs` is true (the default), it generates one
 * row per weekly occurrence between `termStart` and `termEnd` (inclusive);
 * when false, it generates a single row for just the next occurrence on or
 * after `termStart` — for a one-off item like a single exam picked up from
 * the photo. Every occurrence is inflexible (class times aren't up for
 * rebalancing).
 */
export function expandClassToCommitments(
  detected: DetectedClass,
  termStart: Date,
  termEnd: Date,
  recurs: boolean = true,
): NewCommitmentInput[] {
  const weekday = DAY_INDEX[detected.day_of_week]
  const firstDate = nextDateOnOrAfter(termStart, weekday)

  const startHours = parseHoursMinutes(detected.start_time)
  const endHours = parseHoursMinutes(detected.end_time)
  const effortHours = Math.max(MIN_EFFORT_HOURS, endHours - startHours)

  const endHour = Math.floor(endHours)
  const endMinute = Math.round((endHours - endHour) * 60)

  const boundaryDate = recurs ? termEnd : firstDate
  const termEndBoundary = new Date(
    boundaryDate.getFullYear(),
    boundaryDate.getMonth(),
    boundaryDate.getDate(),
    23,
    59,
    59,
    999,
  )

  const commitments: NewCommitmentInput[] = []
  const date = new Date(firstDate)

  while (date.getTime() <= termEndBoundary.getTime()) {
    const due = new Date(date)
    due.setHours(endHour, endMinute, 0, 0)

    commitments.push({
      title: detected.title,
      category: 'time' as const,
      effort_hours: Math.round(effortHours * 4) / 4,
      due_at: due.toISOString(),
      priority: 1 as const,
      is_flexible: false,
    })

    date.setDate(date.getDate() + 7)
  }

  return commitments
}
