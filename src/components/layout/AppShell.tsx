import { NavLink, Outlet } from 'react-router-dom'
import {
  CalendarIcon,
  CheckCircleIcon,
  HomeIcon,
  PlusCircleIcon,
  ScaleIcon,
  SettingsIcon,
  TrendingUpIcon,
} from '../icons'

const TABS = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/schedule', label: 'Schedule', Icon: CalendarIcon, end: false },
  { to: '/balancer', label: 'Balance', Icon: ScaleIcon, end: false },
  { to: '/checkin', label: 'Check in', Icon: CheckCircleIcon, end: false },
  { to: '/trends', label: 'Trends', Icon: TrendingUpIcon, end: false },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon, end: false },
]

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[var(--color-surface)]">
      <main className="flex-1 px-4 pb-28 pt-6">
        <Outlet />
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="relative flex w-full items-stretch justify-around rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]/95 px-1 shadow-[var(--shadow-lg)] backdrop-blur">
          {TABS.slice(0, 3).map((tab) => (
            <TabLink key={tab.to} {...tab} />
          ))}

          <NavLink
            to="/add"
            aria-label="Add something"
            className="relative -top-4 flex flex-shrink-0 flex-col items-center justify-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-[var(--shadow-accent)] transition-transform duration-150 active:scale-95">
              <PlusCircleIcon className="h-7 w-7" />
            </span>
          </NavLink>

          {TABS.slice(3).map((tab) => (
            <TabLink key={tab.to} {...tab} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function TabLink({
  to,
  label,
  Icon,
  end,
}: {
  to: string
  label: string
  Icon: (props: { className?: string }) => React.JSX.Element
  end: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors duration-150 ${
          isActive ? 'text-[var(--color-accent-strong)] font-semibold' : 'text-[var(--color-ink-faint)]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 ${
              isActive ? 'bg-[var(--color-accent-soft)]' : ''
            }`}
          >
            <Icon className="h-[19px] w-[19px]" />
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}
