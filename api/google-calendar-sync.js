import { getValidAccessToken, supabaseRest } from './_lib/google-tokens.js'

const GCAL_SYNC_SECRET = process.env.GCAL_SYNC_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

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
    let totalSynced = 0
    let errors = 0

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
        const timeMin = now.toISOString()
        const futureDate = new Date(now)
        futureDate.setDate(futureDate.getDate() + 14)
        const timeMax = futureDate.toISOString()

        const calendarIds = [...new Set(staffList.map(s => s.google_calendar_id))]
        const freeBusyRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeMin,
            timeMax,
            timeZone: 'America/Santiago',
            items: calendarIds.map(id => ({ id })),
          }),
        })

        if (!freeBusyRes.ok) {
          console.error(`FreeBusy failed for user ${userId}:`, await freeBusyRes.text())
          errors++
          continue
        }

        const freeBusyData = await freeBusyRes.json()
        const calendarsData = freeBusyData.calendars || {}

        for (const staff of staffList) {
          const calData = calendarsData[staff.google_calendar_id]
          if (!calData?.busy) continue

          const today = now.toISOString().slice(0, 10)
          await fetch(
            `${SUPABASE_URL}/rest/v1/schedule_overrides?staff_id=eq.${staff.id}&reason=eq.google_calendar_sync&override_date=gte.${today}`,
            { method: 'DELETE', headers: SB_HEADERS }
          )

          const overrides = calData.busy.map(block => {
            const start = toChileTime(block.start)
            const end = toChileTime(block.end)
            return {
              staff_id: staff.id,
              override_date: start.date,
              is_available: false,
              start_time: start.time,
              end_time: end.time,
              reason: 'google_calendar_sync',
            }
          }).filter(o => o.start_time !== o.end_time)

          if (overrides.length > 0) {
            await fetch(`${SUPABASE_URL}/rest/v1/schedule_overrides`, {
              method: 'POST',
              headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
              body: JSON.stringify(overrides),
            })
          }

          totalSynced += overrides.length
        }
      } catch (err) {
        console.error(`Sync error for user ${userId}:`, err.message)
        errors++
      }
    }

    return res.json({ synced: totalSynced, errors, users: userIds.length })
  } catch (err) {
    console.error('Sync global error:', err)
    return res.status(500).json({ message: 'Error de sincronización' })
  }
}
