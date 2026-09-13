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

  // Google's refresh response normally omits refresh_token — the original stays valid.
  return response.json()
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

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const todayStart = `${today}T00:00:00Z`
  const tomorrowStart = `${tomorrow}T00:00:00Z`
  const healthHeaders = { Authorization: `Bearer ${accessToken}` }

  const sleepFilter = `sleep.interval.civil_end_time >= "${today}" AND sleep.interval.civil_end_time < "${tomorrow}"`
  const heartFilter = `heart-rate.interval.start_time >= "${todayStart}" AND heart-rate.interval.start_time < "${tomorrowStart}"`

  // Step count is left out: it needs an activity_and_fitness scope that
  // turned out not to exist under this API, so it's simply unavailable.
  const [sleepRes, heartRes] = await Promise.all([
    fetch(
      `https://health.googleapis.com/v4/users/me/dataTypes/sleep/dataPoints?filter=${encodeURIComponent(sleepFilter)}`,
      { headers: healthHeaders },
    ),
    fetch(
      `https://health.googleapis.com/v4/users/me/dataTypes/heart-rate/dataPoints?filter=${encodeURIComponent(heartFilter)}&pageSize=200`,
      { headers: healthHeaders },
    ),
  ])

  if (!sleepRes.ok || !heartRes.ok) {
    console.error(
      'Google Health data fetch failed',
      sleepRes.status,
      await sleepRes.text().catch(() => ''),
      heartRes.status,
      await heartRes.text().catch(() => ''),
    )
    return jsonResponse({ error: 'Failed to fetch data from Google Health' }, 502)
  }

  const sleepData = await sleepRes.json()
  const heartData = await heartRes.json()

  // Field shapes for these newly-launched data types aren't fully confirmed
  // by public docs yet — logging the raw payload so it can be inspected and
  // the extraction below adjusted from a real response if needed.
  console.log('sleep dataPoints response', JSON.stringify(sleepData))
  console.log('heart dataPoints response', JSON.stringify(heartData))

  const sleepPoint = sleepData?.dataPoints?.[0]

  const sleepMinutes: number | null =
    sleepPoint?.sleep?.durationMinutes ?? sleepPoint?.value?.durationMinutes ?? null
  const sleepEfficiency: number | null = sleepPoint?.sleep?.efficiency ?? sleepPoint?.value?.efficiency ?? null

  // heart-rate returns many readings across the day; approximate "resting"
  // as the lowest reading rather than an average, since a single elevated
  // reading shouldn't drag the whole-day figure up.
  const heartValues: number[] = (heartData?.dataPoints ?? [])
    .map(
      (p: Record<string, unknown>) =>
        (p as any)?.heartRate?.bpm ?? (p as any)?.value?.bpm ?? (p as any)?.value?.fpVal ?? (p as any)?.value?.intVal,
    )
    .filter((v: unknown): v is number => typeof v === 'number')

  const restingHeartRate: number | null = heartValues.length > 0 ? Math.min(...heartValues) : null

  const { data: metric, error: upsertError } = await supabase
    .from('wearable_metrics')
    .upsert(
      {
        user_id: user.id,
        logged_on: today,
        resting_heart_rate: restingHeartRate,
        sleep_minutes: sleepMinutes,
        sleep_efficiency: sleepEfficiency,
        steps: null,
        source: 'fitbit',
      },
      { onConflict: 'user_id,logged_on,source' },
    )
    .select()
    .single()

  if (upsertError) {
    console.error('Failed to store wearable metric', upsertError)
    return jsonResponse({ error: 'Failed to save synced data' }, 500)
  }

  return jsonResponse(metric)
})
