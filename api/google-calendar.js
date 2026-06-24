import crypto from 'crypto'
import {
  corsHeaders, verifyUser, storeCredential,
  getDecryptedCredential, deleteCredentials,
  getValidAccessToken, supabaseRest
} from './_lib/google-tokens.js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
const SUPABASE_ENCRYPT_KEY = process.env.SUPABASE_ENCRYPT_KEY
const GCAL_SYNC_SECRET = process.env.GCAL_SYNC_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.SITE_URL || 'https://mitiendavirtual.cl'

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
}

function signState(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', SUPABASE_ENCRYPT_KEY).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verifyState(state) {
  const [data, sig] = state.split('.')
  if (!data || !sig) return null
  const expected = crypto.createHmac('sha256', SUPABASE_ENCRYPT_KEY).update(data).digest('base64url')
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (Date.now() - payload.ts > 5 * 60 * 1000) return null
    return payload
  } catch { return null }
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

function toChileTime(isoString) {
  const d = new Date(isoString)
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type) => parts.find(p => p.type === type)?.value || ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

/* ==================== ACTION: AUTH (status / start OAuth / disconnect) ==================== */
async function handleAuth(req, res) {
  const user = await verifyUser(req)
  if (!user) return res.status(401).json({ message: 'No autorizado' })

  if (req.method === 'GET') {
    const meta = await getDecryptedCredential(user.id, 'google_calendar', 'token_metadata')
    if (!meta) return res.json({ connected: false })
    try {
      const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta
      return res.json({ connected: true, email: parsed.email || '' })
    } catch { return res.json({ connected: true, email: '' }) }
  }

  if (req.method === 'POST') {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ message: 'Google Calendar no configurado en el servidor.' })
    }
    const state = signState({ user_id: user.id, ts: Date.now() })
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' ')
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
  }

  if (req.method === 'DELETE') {
    try {
      const token = await getValidAccessToken(user.id).catch(() => null)
      if (token) await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' }).catch(() => {})
    } catch {}
    await deleteCredentials(user.id, 'google_calendar')
    await supabaseRest('PATCH', `staff_members?user_id=eq.${user.id}&google_calendar_id=not.is.null`, { google_calendar_id: null })
    await supabaseRest('DELETE', `schedule_overrides?reason=eq.google_calendar_sync&staff_id=in.(select id from staff_members where user_id='${user.id}')`).catch(() => {})
    return res.json({ ok: true })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}

/* ==================== ACTION: CALLBACK (Google OAuth redirect) ==================== */
async function handleCallback(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { code, state, error } = req.query || {}

  if (error) return res.redirect(302, `${SITE_URL}/dashboard?gcal=error&reason=${encodeURIComponent(error)}`)
  if (!code || !state) return res.redirect(302, `${SITE_URL}/dashboard?gcal=error&reason=missing_params`)

  const payload = verifyState(state)
  if (!payload) return res.redirect(302, `${SITE_URL}/dashboard?gcal=error&reason=invalid_state`)

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI, grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text())
      return res.redirect(302, `${SITE_URL}/dashboard?gcal=error&reason=token_exchange`)
    }
    const tokens = await tokenRes.json()

    let email = ''
    try {
      const uiRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (uiRes.ok) email = (await uiRes.json()).email || ''
    } catch {}

    await storeCredential(payload.user_id, 'google_calendar', 'refresh_token', tokens.refresh_token)
    await storeCredential(payload.user_id, 'google_calendar', 'access_token', tokens.access_token)
    await storeCredential(payload.user_id, 'google_calendar', 'token_metadata', JSON.stringify({
      email, expires_at: Date.now() + (tokens.expires_in || 3600) * 1000, scope: tokens.scope || '',
    }))

    return res.redirect(302, `${SITE_URL}/dashboard?gcal=connected`)
  } catch (err) {
    console.error('Google Calendar callback error:', err)
    return res.redirect(302, `${SITE_URL}/dashboard?gcal=error&reason=server_error`)
  }
}

/* ==================== ACTION: LIST (calendars) ==================== */
async function handleList(req, res) {
  const user = await verifyUser(req)
  if (!user) return res.status(401).json({ message: 'No autorizado' })

  try {
    const accessToken = await getValidAccessToken(user.id)
    const gcalRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!gcalRes.ok) {
      console.error('Calendar list error:', await gcalRes.text())
      return res.status(502).json({ message: 'Error al consultar Google Calendar' })
    }
    const data = await gcalRes.json()
    const calendars = (data.items || [])
      .filter(c => c.accessRole === 'owner' || c.accessRole === 'writer')
      .map(c => ({ id: c.id, summary: c.summary || c.id, primary: c.primary || false }))
    return res.json({ calendars })
  } catch (err) {
    if (err.message?.includes('refresh')) return res.status(401).json({ message: 'Reconexión requerida', reconnect: true })
    return res.status(500).json({ message: 'Error interno' })
  }
}

/* ==================== ACTION: ASSIGN (calendar to staff) ==================== */
async function handleAssign(req, res) {
  const user = await verifyUser(req)
  if (!user) return res.status(401).json({ message: 'No autorizado' })

  const body = await parseBody(req)
  const { staff_id, calendar_id } = body
  if (!staff_id) return res.status(400).json({ message: 'staff_id requerido' })

  const staff = await supabaseRest('GET', `staff_members?id=eq.${staff_id}&user_id=eq.${user.id}&select=id`)
  if (!staff || !staff.length) return res.status(403).json({ message: 'Profesional no encontrado' })

  await supabaseRest('PATCH', `staff_members?id=eq.${staff_id}`, { google_calendar_id: calendar_id || null })
  return res.json({ ok: true })
}

/* ==================== ACTION: SYNC (n8n cron - busy blocks) ==================== */
async function handleSync(req, res) {
  const secret = req.headers['x-gcal-sync-secret']
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (secret !== GCAL_SYNC_SECRET && auth !== SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ message: 'No autorizado' })
  }

  try {
    const credRes = await fetch(
      `${SUPABASE_URL}/rest/v1/integration_credentials?provider=eq.google_calendar&credential_type=eq.refresh_token&select=user_id`,
      { headers: SB_HEADERS }
    )
    const creds = await credRes.json()
    if (!creds?.length) return res.json({ synced: 0, message: 'No hay usuarios conectados' })

    const userIds = [...new Set(creds.map(c => c.user_id))]
    let totalSynced = 0, errors = 0

    for (const userId of userIds) {
      try {
        const accessToken = await getValidAccessToken(userId)
        const staffRes = await fetch(
          `${SUPABASE_URL}/rest/v1/staff_members?user_id=eq.${userId}&is_active=eq.true&google_calendar_id=not.is.null&select=id,google_calendar_id`,
          { headers: SB_HEADERS }
        )
        const staffList = await staffRes.json()
        if (!staffList?.length) continue

        const now = new Date()
        const futureDate = new Date(now)
        futureDate.setDate(futureDate.getDate() + 14)

        const calendarIds = [...new Set(staffList.map(s => s.google_calendar_id))]
        const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeMin: now.toISOString(), timeMax: futureDate.toISOString(),
            timeZone: 'America/Santiago',
            items: calendarIds.map(id => ({ id })),
          }),
        })
        if (!fbRes.ok) { console.error(`FreeBusy failed for ${userId}`); errors++; continue }

        const fbData = await fbRes.json()
        const calendarsData = fbData.calendars || {}

        for (const staff of staffList) {
          const calData = calendarsData[staff.google_calendar_id]
          if (!calData?.busy) continue

          const today = now.toISOString().slice(0, 10)
          await fetch(
            `${SUPABASE_URL}/rest/v1/schedule_overrides?staff_id=eq.${staff.id}&reason=eq.google_calendar_sync&override_date=gte.${today}`,
            { method: 'DELETE', headers: SB_HEADERS }
          )

          const overrides = calData.busy.map(block => {
            const start = toChileTime(block.start), end = toChileTime(block.end)
            return {
              staff_id: staff.id, override_date: start.date, is_available: false,
              start_time: start.time, end_time: end.time, reason: 'google_calendar_sync',
            }
          }).filter(o => o.start_time !== o.end_time)

          if (overrides.length > 0) {
            await fetch(`${SUPABASE_URL}/rest/v1/schedule_overrides`, {
              method: 'POST', headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
              body: JSON.stringify(overrides),
            })
          }
          totalSynced += overrides.length
        }
      } catch (err) { console.error(`Sync error for ${userId}:`, err.message); errors++ }
    }
    return res.json({ synced: totalSynced, errors, users: userIds.length })
  } catch (err) {
    console.error('Sync global error:', err)
    return res.status(500).json({ message: 'Error de sincronización' })
  }
}

/* ==================== ACTION: EVENT (create/delete calendar events) ==================== */
async function handleEvent(req, res) {
  const secret = req.headers['x-gcal-sync-secret']
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (secret !== GCAL_SYNC_SECRET && auth !== SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ message: 'No autorizado' })
  }

  const body = await parseBody(req)
  const { appointment_id, action } = body
  if (!appointment_id || !action) return res.status(400).json({ message: 'appointment_id y action requeridos' })

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
      const gcalRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: `${appt.services?.name || 'Cita'} - ${appt.client_name}`,
            description: `Cita agendada via Mi Tienda Virtual\nCliente: ${appt.client_name}\nTeléfono: ${appt.client_phone}`,
            start: { dateTime: appt.starts_at, timeZone: 'America/Santiago' },
            end: { dateTime: appt.ends_at, timeZone: 'America/Santiago' },
            reminders: { useDefault: false },
          }),
        }
      )
      if (!gcalRes.ok) { console.error('Create event failed:', await gcalRes.text()); return res.status(502).json({ message: 'Error al crear evento' }) }
      const event = await gcalRes.json()
      await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointment_id}`, {
        method: 'PATCH', headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ google_event_id: event.id }),
      })
      return res.json({ ok: true, google_event_id: event.id })
    }

    if (action === 'delete') {
      const eventId = appt.google_event_id
      if (!eventId) return res.json({ ok: true, skipped: true, reason: 'no_event_id' })
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
      )
      await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointment_id}`, {
        method: 'PATCH', headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ google_event_id: null }),
      })
      return res.json({ ok: true })
    }

    return res.status(400).json({ message: 'action debe ser create o delete' })
  } catch (err) {
    console.error('Event error:', err)
    return res.status(500).json({ message: 'Error interno' })
  }
}

/* ==================== ROUTER ==================== */
export default async function handler(req, res) {
  corsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = (req.query?.action || '').toLowerCase()

  switch (action) {
    case 'callback': return handleCallback(req, res)
    case 'list':     return handleList(req, res)
    case 'assign':   return handleAssign(req, res)
    case 'sync':     return handleSync(req, res)
    case 'event':    return handleEvent(req, res)
    default:         return handleAuth(req, res)
  }
}
