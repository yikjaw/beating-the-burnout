import { supabase } from './supabaseClient'

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
// activity_and_fitness.readonly (for step count) turned out not to be a
// real scope — dropped rather than guess again. Steps stay unavailable.
// One shared Google connection covers both Health data and Calendar export.
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

export interface WearableMetric {
  logged_on: string
  resting_heart_rate: number | null
  sleep_minutes: number | null
  sleep_efficiency: number | null
  steps: number | null
}

/**
 * Starts the Google OAuth flow, requesting both Health data access (sleep,
 * heart rate — the successor to the now-deprecated Fitbit Web API) and
 * Calendar event access in one consent screen. A one-time state token is
 * minted server-side (via an RLS-permitted insert) rather than passing the
 * user's own Supabase session token through Google's authorize URL, which
 * would leak into browser history and server logs.
 */
export async function startFitbitConnect(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data: stateRow, error } = await supabase
    .from('fitbit_oauth_states')
    .insert({ user_id: user.id })
    .select('state')
    .single()

  if (error || !stateRow) throw new Error('Could not start the connection')

  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fitbit-oauth-callback`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: import.meta.env.VITE_GOOGLE_HEALTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: GOOGLE_SCOPES,
    state: stateRow.state,
    access_type: 'offline',
    prompt: 'consent',
  })

  window.location.href = `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`
}
