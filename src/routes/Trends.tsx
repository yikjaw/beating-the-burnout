import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppData } from '../context/AppDataContext'
import { categoryLoad, feltMultiplier, overallCapacity } from '../lib/scoring'

export function Trends() {
  const { capacities, commitments, checkins, loadSnapshots } = useAppData()

  const loads = categoryLoad(commitments, capacities)
  const { percentage: currentLoad } = overallCapacity(loads, [])

  const snapshotByDate = new Map(loadSnapshots.map((s) => [s.logged_on, s.overall_percentage]))

  // Real load percentage from a same-day snapshot (captured at check-in
  // time) when we have one; older check-ins predate that feature, so they
  // fall back to an approximation — today's load scaled by that day's felt
  // multiplier — which is honest but not literal history.
  const data = checkins.map((c) => {
    const snapshot = snapshotByDate.get(c.logged_on)
    const load = snapshot ?? Math.min(1.5, currentLoad * feltMultiplier([c]))
    return {
      date: c.logged_on.slice(5),
      stress: c.stress,
      load: Math.round(load * 100),
    }
  })

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
