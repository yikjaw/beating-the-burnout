export type Category = 'mental' | 'time' | 'physical' | 'social' | 'errands'

export const CATEGORIES: Category[] = ['mental', 'time', 'physical', 'social', 'errands']

export type Priority = 1 | 2 | 3

export type CommitmentStatus = 'open' | 'deferred' | 'done'

export interface Commitment {
  id: string
  title: string
  category: Category
  effort_hours: number
  due_at: string | null
  priority: Priority
  is_flexible: boolean
  status: CommitmentStatus
  deferred_to?: string | null
}

export type CapacityMap = Record<Category, number>

export interface CheckIn {
  logged_on: string
  energy: number
  stress: number
  slept_well: boolean
}

export type CategoryLoadMap = Record<Category, number>
