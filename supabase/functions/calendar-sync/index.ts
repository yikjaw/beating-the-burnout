import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get('GOOGLE_HEALTH_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_HEALTH_CLIENT_SECRET')
  if (!clientId || !clientSecret) return null

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    console.error('Google token refresh failed', response.status, await response.text())
    return null
  }

  return response.json()
}

interface CommitmentRow {
  id: string
  title: string
  category: string
  effort_hours: number
  due_at: string | null
  status: string
  google_event_id: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return jsonResponse({ error: 'Not authenticated' }, 401)

  const { data: connection } = await supabase
    .from('fitbit_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection) {
    return jsonResponse({ error: 'Not connected' }, 400)
  }

  let accessToken = connection.access_token

  if (new Date(connection.expires_at).getTime() <= Date.now()) {
    const refreshed = await refreshAccessToken(connection.refresh_token)
    if (!refreshed) {
      return jsonResponse({ error: 'Could not refresh access — try reconnecting.' }, 401)
    }
    accessToken = refreshed.access_token
    await supabase
      .from('fitbit_connections')
      .update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq('user_id', user.id)
  }

  const { data: commitments, error: fetchError } = await supabase
    .from('commitments')
    .select('id, title, category, effort_hours, due_at, status, google_event_id')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .not('due_at', 'is', null)

  if (fetchError) {
    console.error('Failed to fetch commitments', fetchError)
    return jsonResponse({ error: 'Failed to load commitments' }, 500)
  }

  const calendarHeaders = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  let synced = 0
  let failed = 0

  for (const c of (commitments ?? []) as CommitmentRow[]) {
    const due = new Date(c.due_at as string)
    const start = new Date(due.getTime() - c.effort_hours * 60 * 60 * 1000)

    const event = {
      summary: c.title,
      description: `${c.category} — synced from Beating the Burnout`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: due.toISOString() },
    }

    const url = c.google_event_id
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${c.google_event_id}`
      : 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    const method = c.google_event_id ? 'PATCH' : 'POST'

    const response = await fetch(url, { method, headers: calendarHeaders, body: JSON.stringify(event) })

    if (!response.ok) {
      console.error('Calendar sync failed for commitment', c.id, response.status, await response.text().catch(() => ''))
      failed += 1
      continue
    }

    const result = await response.json()
    if (!c.google_event_id && result.id) {
      await supabase.from('commitments').update({ google_event_id: result.id }).eq('id', c.id)
    }
    synced += 1
  }

  return jsonResponse({ synced, failed })
})
