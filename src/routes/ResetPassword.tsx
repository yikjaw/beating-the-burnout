import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PasswordField } from '../components/PasswordField'
import { useAuth } from '../context/AuthContext'
import { usePasswordConfirmation } from '../hooks/usePasswordConfirmation'
import { friendlyAuthError } from '../lib/authErrors'

const MIN_PASSWORD_LENGTH = 8

export function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const { password, setPassword, confirmPassword, setConfirmPassword, confirmError, isValid, markTouched } =
    usePasswordConfirmation(MIN_PASSWORD_LENGTH)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValid) {
      markTouched()
      return
    }

    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)

    if (result.error) {
      setError(friendlyAuthError(result.error))
      return
    }

    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Followed the link from your email? Choose a new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordField
          id="newPassword"
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
        />
        <p className="-mt-2 text-xs text-[var(--color-ink-soft)]">At least {MIN_PASSWORD_LENGTH} characters.</p>

        <PasswordField
          id="confirmNewPassword"
          label="Re-enter new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          error={confirmError}
        />

        {error && (
          <p role="alert" className="text-sm text-[var(--color-flag)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !isValid}
          className="rounded-xl bg-[var(--color-accent)] px-6 py-3 text-base font-semibold text-white disabled:opacity-40"
        >
          Update password
        </button>
      </form>
    </div>
  )
}
