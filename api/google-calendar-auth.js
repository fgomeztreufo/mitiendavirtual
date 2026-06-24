import crypto from 'crypto'
import { corsHeaders, verifyUser, getDecryptedCredential, deleteCredentials, getValidAccessToken, supabaseRest } from './_lib/google-tokens.js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
const SUPABASE_ENCRYPT_KEY = process.env.SUPABASE_ENCRYPT_KEY

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
  } catch {
    return null
  }
}

export { verifyState }

export default async function handler(req, res) {
  corsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await verifyUser(req)
  if (!user) return res.status(401).json({ message: 'No autorizado' })

  if (req.method === 'GET') {
    const meta = await getDecryptedCredential(user.id, 'google_calendar', 'token_metadata')
    if (!meta) return res.json({ connected: false })
    try {
      const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta
      return res.json({ connected: true, email: parsed.email || '' })
    } catch {
      return res.json({ connected: true, email: '' })
    }
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
      if (token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' }).catch(() => {})
      }
    } catch {}

    await deleteCredentials(user.id, 'google_calendar')

    await supabaseRest('PATCH', `staff_members?user_id=eq.${user.id}&google_calendar_id=not.is.null`, { google_calendar_id: null })

    await supabaseRest('DELETE',
      `schedule_overrides?reason=eq.google_calendar_sync&staff_id=in.(select id from staff_members where user_id='${user.id}')`)
      .catch(() => {})

    return res.json({ ok: true })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
