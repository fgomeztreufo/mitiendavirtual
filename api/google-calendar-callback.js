import { storeCredential } from './_lib/google-tokens.js'
import { verifyState } from './google-calendar-auth.js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
const SITE_URL = process.env.SITE_URL || 'https://mitiendavirtual.cl'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { code, state, error } = req.query || {}

  if (error) {
    return res.redirect(302, `${SITE_URL}/dashboard?gcal=error&reason=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return res.redirect(302, `${SITE_URL}/dashboard?gcal=error&reason=missing_params`)
  }

  const payload = verifyState(state)
  if (!payload) {
    return res.redirect(302, `${SITE_URL}/dashboard?gcal=error&reason=invalid_state`)
  }

  const userId = payload.user_id

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Token exchange failed:', err)
      return res.redirect(302, `${SITE_URL}/dashboard?gcal=error&reason=token_exchange`)
    }

    const tokens = await tokenRes.json()

    let email = ''
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json()
        email = userInfo.email || ''
      }
    } catch {}

    await storeCredential(userId, 'google_calendar', 'refresh_token', tokens.refresh_token)
    await storeCredential(userId, 'google_calendar', 'access_token', tokens.access_token)
    await storeCredential(userId, 'google_calendar', 'token_metadata', JSON.stringify({
      email,
      expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
      scope: tokens.scope || '',
    }))

    return res.redirect(302, `${SITE_URL}/dashboard?gcal=connected`)
  } catch (err) {
    console.error('Google Calendar callback error:', err)
    return res.redirect(302, `${SITE_URL}/dashboard?gcal=error&reason=server_error`)
  }
}
