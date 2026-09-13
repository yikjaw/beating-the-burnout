import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL = Deno.env.get('APP_URL') ?? 'https://beating-the-burnout.ecommerce-app.workers.dev'
const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fitbit-oauth-callback`

function redirectTo(path: string): Response {
  return new Response(null, { status: 302, headers: { Location: `${APP_URL}${path}` } })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError || !code || !state) {
    return redirectTo('/settings?fitbit=error')
  }

  const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // One-time state token: look up which user started this flow, then burn it
  // immediately so it can't be replayed.
  const { data: stateRow } = await serviceClient
    .from('fitbit_oauth_states')
    .select('user_id')
    .eq('state', state)
    .maybeSingle()

  if (!stateRow) {
    return redirectTo('/settings?fitbit=error')
  }

  await serviceClient.from('fitbit_oauth_states').delete().eq('state', state)

  const clientId = Deno.env.get('GOOGLE_HEALTH_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_HEALTH_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    console.error('Google Health integration is not configured (missing client id/secret)')
    return redirectTo('/settings?fitbit=error')
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
    }),
  })

  if (!tokenResponse.ok) {
    console.error('Google token exchange failed', tokenResponse.status, await tokenResponse.text())
    return redirectTo('/settings?fitbit=error')
  }

  const tokens = await tokenResponse.json()

  if (!tokens.refresh_token) {
    console.error('No refresh_token returned — the authorize URL must include access_type=offline&prompt=consent')
    return redirectTo('/settings?fitbit=error')
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const { error: upsertError } = await serviceClient.from('fitbit_connections').upsert({
    user_id: stateRow.user_id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    fitbit_user_id: null,
    connected_at: new Date().toISOString(),
  })

  if (upsertError) {
    console.error('Failed to store Google Health connection', upsertError)
    return redirectTo('/settings?fitbit=error')
  }

  return redirectTo('/settings?fitbit=connected')
})
