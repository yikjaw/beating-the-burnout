import type { Category } from './types'

export const CATEGORY_LABEL: Record<Category, string> = {
  mental: 'Mental',
  time: 'Time',
  physical: 'Physical',
  social: 'Social',
  errands: 'Errands',
}

export const CATEGORY_PROMPT: Record<Category, string> = {
  mental: 'Studying, focus work, mental load',
  time: 'Classes, jobs, fixed schedule hours',
  physical: 'Exercise, movement, physical health',
  social: 'Friends, family, relationships',
  errands: 'Chores, admin, life upkeep',
}
