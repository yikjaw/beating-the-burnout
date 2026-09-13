import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppData } from '../context/AppDataContext'
import { categoryLoad, feltMultiplier, overallCapacity } from '../lib/scoring'

export function Trends() {
  const { capacities, commitments, checkins } = useAppData()

  const loads = categoryLoad(commitments, capacities)
  const { percentage: currentLoad } = overallCapacity(loads, [])

  // We only keep a rolling history of check-ins, not day-by-day snapshots
  // of booked hours, so the load line is the current week's load scaled by
  // each day's felt multiplier — an honest approximation that still shows
  // whether stress and workload move together.
  const data = checkins.map((c) => ({
    date: c.logged_on.slice(5),
    stress: c.stress,
    load: Math.round(Math.min(1.5, currentLoad * feltMultiplier([c])) * 100),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Stress and load</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Plotted together so the correlation is visible.</p>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">Check in for a few days to see your trend.</p>
      ) : (
        <div className="h-72 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-ink-soft)' }} />
              <YAxis
                yAxisId="stress"
                domain={[1, 5]}
                tick={{ fontSize: 12, fill: 'var(--color-ink-soft)' }}
                width={28}
              />
              <YAxis
                yAxisId="load"
                orientation="right"
                domain={[0, 150]}
                tick={{ fontSize: 12, fill: 'var(--color-ink-soft)' }}
                width={36}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, borderColor: 'var(--color-border)', fontSize: 13 }}
                formatter={(value, name) => (name === 'Load' ? [`${value}%`, name] : [value, name])}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                yAxisId="stress"
                type="monotone"
                dataKey="stress"
                name="Stress"
                stroke="var(--color-chart-stress)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="load"
                type="monotone"
                dataKey="load"
                name="Load"
                stroke="var(--color-chart-load)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
