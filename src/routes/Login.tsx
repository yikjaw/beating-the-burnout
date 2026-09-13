import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PasswordField } from '../components/PasswordField'
import { useAuth } from '../context/AuthContext'
import { usePasswordConfirmation } from '../hooks/usePasswordConfirmation'
import { friendlyAuthError } from '../lib/authErrors'

const MIN_PASSWORD_LENGTH = 8

export function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const {
    password: signUpPassword,
    setPassword: setSignUpPassword,
    confirmPassword,
    setConfirmPassword,
    confirmError,
    isValid: signUpValid,
    reset: resetSignUpPassword,
    markTouched,
  } = usePasswordConfirmation(MIN_PASSWORD_LENGTH)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit =
    email.trim().length > 0 && (mode === 'signIn' ? signInPassword.length > 0 : signUpValid)

  function resetMessages() {
    setError(null)
    setInfo(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    resetMessages()

    if (mode === 'signUp' && !signUpValid) {
      markTouched()
      return
    }

    setSubmitting(true)

    if (mode === 'signIn') {
      const result = await signIn(email, signInPassword)
      setSubmitting(false)
      if (result.error) {
        setError(friendlyAuthError(result.error))
        return
      }
      navigate('/')
      return
    }

    const result = await signUp(email, signUpPassword)
    setSubmitting(false)

    if (result.error) {
      setError(friendlyAuthError(result.error))
      return
    }

    if (result.signedIn) {
      navigate('/')
      return
    }

    setInfo('Account created. Check your email to confirm, then sign in.')
    switchMode('signIn')
  }

  function switchMode(next: 'signIn' | 'signUp') {
    setMode(next)
    setSignInPassword('')
    resetSignUpPassword()
    resetMessages()
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-2xl font-extrabold text-white shadow-[var(--shadow-accent)]">
          B
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Beating the Burnout</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Workload and energy, tracked honestly.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-5">
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
            className="field-input"
          />
        </div>

        {mode === 'signIn' ? (
          <>
            <PasswordField
              id="password"
              label="Password"
              value={signInPassword}
              onChange={setSignInPassword}
              autoComplete="current-password"
            />
            <Link
              to="/forgot-password"
              className="-mt-2 self-end text-sm text-[var(--color-ink-soft)] underline underline-offset-2"
            >
              Forgot password?
            </Link>
          </>
        ) : (
          <>
            <PasswordField
              id="password"
              label="Password"
              value={signUpPassword}
              onChange={setSignUpPassword}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
            />
            <p className="-mt-2 text-xs text-[var(--color-ink-soft)]">At least {MIN_PASSWORD_LENGTH} characters.</p>

            <PasswordField
              id="confirmPassword"
              label="Re-enter password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              error={confirmError}
            />
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-[var(--color-flag-text)]">
            {error}
          </p>
        )}
        {info && <p className="text-sm text-[var(--color-accent-strong)]">{info}</p>}

        <button type="submit" disabled={submitting || !canSubmit} className="btn-primary">
          {mode === 'signIn' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')}
        className="text-center text-sm text-[var(--color-ink-soft)] underline underline-offset-2"
      >
        {mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
