import { useMemo, useState } from 'react'

/** Shared "enter password twice, must match" state for sign-up and password-reset forms. */
export function usePasswordConfirmation(minLength: number) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPasswordState] = useState('')
  const [touched, setTouched] = useState(false)

  function setConfirmPassword(value: string) {
    setConfirmPasswordState(value)
    setTouched(true)
  }

  const confirmError = useMemo(() => {
    if (!touched) return null
    if (confirmPassword.length === 0) return 'Re-enter your password.'
    if (confirmPassword !== password) return "Passwords don't match."
    return null
  }, [touched, confirmPassword, password])

  const isValid = password.length >= minLength && confirmPassword.length > 0 && confirmPassword === password

  function reset() {
    setPassword('')
    setConfirmPasswordState('')
    setTouched(false)
  }

  function markTouched() {
    setTouched(true)
  }

  return { password, setPassword, confirmPassword, setConfirmPassword, confirmError, isValid, reset, markTouched }
}
