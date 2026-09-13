import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { friendlyAuthError } from '../lib/authErrors'

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await requestPasswordReset(email)
    setSubmitting(false)

    if (result.error) {
      setError(friendlyAuthError(result.error))
      return
    }
    setSent(true)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          We'll email you a link to set a new one.
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-[var(--color-ink)]">
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
          </p>
          <Link to="/login" className="text-sm text-[var(--color-ink-soft)] underline underline-offset-2">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-base"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--color-flag)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || email.trim().length === 0}
            className="rounded-xl bg-[var(--color-accent)] px-6 py-3 text-base font-semibold text-white disabled:opacity-40"
          >
            Send reset link
          </button>

          <Link to="/login" className="text-center text-sm text-[var(--color-ink-soft)] underline underline-offset-2">
            Back to sign in
          </Link>
        </form>
      )}
    </div>
  )
}
