import { CATEGORY_LABEL } from '../lib/categoryMeta'
import type { Category } from '../lib/types'

interface CapacityRingProps {
  category: Category
  load: number
}

const SIZE = 64
const STROKE = 6
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function CapacityRing({ category, load }: CapacityRingProps) {
  const flagged = load > 0.85
  const displayLoad = Number.isFinite(load) ? load : 1.5
  const fraction = Math.min(1, displayLoad)
  const offset = CIRCUMFERENCE * (1 - fraction)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${CATEGORY_LABEL[category]} load: ${Math.round(displayLoad * 100)} percent${flagged ? ', above your comfortable range' : ''}`}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={flagged ? 'var(--color-flag)' : 'var(--color-accent)'}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="var(--color-ink)"
          aria-hidden="true"
        >
          {Math.round(displayLoad * 100)}
        </text>
      </svg>
      <span className="text-xs text-[var(--color-ink-soft)]">{CATEGORY_LABEL[category]}</span>
    </div>
  )
}
