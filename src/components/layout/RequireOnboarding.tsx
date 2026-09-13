import { Navigate, Outlet } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'

/** Sends a brand-new user (no capacities set yet) to onboarding first. */
export function RequireOnboarding() {
  const { loading, hasOnboarded } = useAppData()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-ink-soft)]">
        Loading…
      </div>
    )
  }

  if (!hasOnboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
