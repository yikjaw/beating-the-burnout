import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home', icon: '⊙' },
  { to: '/schedule', label: 'Schedule', icon: '▦' },
  { to: '/add', label: 'Add', icon: '+' },
  { to: '/balancer', label: 'Balance', icon: '⚖' },
  { to: '/checkin', label: 'Check in', icon: '✓' },
  { to: '/trends', label: 'Trends', icon: '∿' },
]

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[var(--color-surface)]">
      <main className="flex-1 px-4 pb-24 pt-6">
        <Outlet />
      </main>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-stretch justify-around border-t border-[var(--color-border)] bg-[var(--color-surface-raised)]"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
                isActive ? 'text-[var(--color-accent-strong)] font-semibold' : 'text-[var(--color-ink-soft)]'
              }`
            }
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {tab.icon}
            </span>
            {tab.label}
          </NavLink>
        ))}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
              isActive ? 'text-[var(--color-accent-strong)] font-semibold' : 'text-[var(--color-ink-soft)]'
            }`
          }
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {'⚙'}
          </span>
          Settings
        </NavLink>
      </nav>
    </div>
  )
}
