import { getValidAccessToken, supabaseRest } from './_lib/google-tokens.js'

const GCAL_SYNC_SECRET = process.env.GCAL_SYNC_SECRET
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
}

async function parseBody(req) {
  if (req.body) return req.body
  return new Promise((resolve) => {
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } })
    req.on('error', () => resolve({}))
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const secret = req.headers['x-gcal-sync-secret']
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (secret !== GCAL_SYNC_SECRET && auth !== SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ message: 'No autorizado' })
  }

  const body = await parseBody(req)
  const { appointment_id, action } = body

  if (!appointment_id || !action) {
    return res.status(400).json({ message: 'appointment_id y action requeridos' })
  }

  try {
    const apptRes = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointment_id}&select=*,staff_members(google_calendar_id,user_id),services(name)`,
      { headers: SB_HEADERS }
    )
    const appts = await apptRes.json()
    if (!appts?.length) return res.status(404).json({ message: 'Cita no encontrada' })

    const appt = appts[0]
    const calendarId = appt.staff_members?.google_calendar_id
    const userId = appt.staff_members?.user_id || appt.user_id

    if (!calendarId) return res.json({ ok: true, skipped: true, reason: 'no_calendar_assigned' })

    const accessToken = await getValidAccessToken(userId)

    if (action === 'create') {
      const eventBody = {
        summary: `${appt.services?.name || 'Cita'} - ${appt.client_name}`,
        description: `Cita agendada via Mi Tienda Virtual\nCliente: ${appt.client_name}\nTeléfono: ${appt.client_phone}`,
        start: { dateTime: appt.starts_at, timeZone: 'America/Santiago' },
        end: { dateTime: appt.ends_at, timeZone: 'America/Santiago' },
        reminders: { useDefault: false },
      }

      const gcalRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBody),
        }
      )

      if (!gcalRes.ok) {
        const err = await gcalRes.text()
        console.error('Create event failed:', err)
        return res.status(502).json({ message: 'Error al crear evento en Google Calendar' })
      }

      const event = await gcalRes.json()

      await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointment_id}`, {
        method: 'PATCH',
        headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ google_event_id: event.id }),
      })

      return res.json({ ok: true, google_event_id: event.id })
    }

    if (action === 'delete') {
      const eventId = appt.google_event_id
      if (!eventId) return res.json({ ok: true, skipped: true, reason: 'no_event_id' })

      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointment_id}`, {
        method: 'PATCH',
        headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ google_event_id: null }),
      })

      return res.json({ ok: true })
    }

    return res.status(400).json({ message: 'action debe ser create o delete' })
  } catch (err) {
    console.error('Google Calendar event error:', err)
    return res.status(500).json({ message: 'Error interno' })
  }
}
