const FRIENDLY_MESSAGES: Record<string, string> = {
  'Invalid login credentials': "That email or password doesn't match our records.",
  'User already registered': 'An account with that email already exists — try signing in instead.',
  'Email not confirmed': 'Please confirm your email before signing in — check your inbox.',
  'Email rate limit exceeded': "You've tried that a few too many times. Wait a minute and try again.",
  'Password should be at least 6 characters': 'Password needs to be at least 8 characters.',
}

/** Supabase auth errors are usually already user-facing, but a few are raw
 * enough (or jargon-y) that they need a friendlier rewrite before display. */
export function friendlyAuthError(message: string): string {
  return FRIENDLY_MESSAGES[message] ?? 'Something went wrong. Please try again.'
}
