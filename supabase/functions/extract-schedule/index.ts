const GEMINI_MODEL = 'gemini-3.6-flash'
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const PROMPT =
  "This image is a photo or screenshot of a student's weekly class timetable. Identify every distinct recurring class session shown: its title, day of week, and start/end time in 24-hour HH:MM format. If a block spans multiple distinct classes, list each separately. Ignore anything that isn't a scheduled class block (e.g. headers, room numbers on their own)."

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    classes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          day_of_week: { type: 'string', enum: DAYS },
          start_time: { type: 'string' },
          end_time: { type: 'string' },
        },
        required: ['title', 'day_of_week', 'start_time', 'end_time'],
      },
    },
  },
  required: ['classes'],
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  let payload: { image_base64?: string; media_type?: string }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const { image_base64, media_type } = payload
  if (!image_base64 || !media_type) {
    return jsonResponse({ error: 'Missing image_base64 or media_type' }, 400)
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return jsonResponse({ error: 'Schedule import is not configured on the server' }, 500)
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: PROMPT }, { inline_data: { mime_type: media_type, data: image_base64 } }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    )

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text()
      console.error('Gemini API error', geminiResponse.status, errBody)
      return jsonResponse({ error: 'Failed to process the image' }, 500)
    }

    const result = await geminiResponse.json()
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return jsonResponse({ error: "Couldn't read a schedule from that image. Try a clearer photo." }, 422)
    }

    return jsonResponse(JSON.parse(text))
  } catch (error) {
    console.error('extract-schedule failed', error)
    return jsonResponse({ error: 'Failed to process the image' }, 500)
  }
})
