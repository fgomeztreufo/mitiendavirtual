const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ENCRYPT_KEY = process.env.SUPABASE_ENCRYPT_KEY
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
}

export async function storeCredential(userId, provider, credentialType, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/store_integration_credential`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify({
      p_user_id: userId,
      p_instance_id: null,
      p_provider: provider,
      p_credential_type: credentialType,
      p_credential_value_text: value,
      p_encrypt_key: SUPABASE_ENCRYPT_KEY,
    }),
  })
  return res.ok
}

export async function getDecryptedCredential(userId, provider, credentialType) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_decrypted_credential`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify({
      p_user_id: userId,
      p_instance_id: null,
      p_provider: provider,
      p_credential_type: credentialType,
      p_encrypt_key: SUPABASE_ENCRYPT_KEY,
    }),
  })
  if (!res.ok) return null
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text.replace(/^"|"$/g, '') }
}

export async function deleteCredentials(userId, provider) {
  const url = `${SUPABASE_URL}/rest/v1/integration_credentials?user_id=eq.${userId}&provider=eq.${provider}`
  await fetch(url, { method: 'DELETE', headers: SB_HEADERS })
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token refresh failed: ${err}`)
  }
  return res.json()
}

export async function getValidAccessToken(userId) {
  const metaRaw = await getDecryptedCredential(userId, 'google_calendar', 'token_metadata')
  let meta = null
  if (metaRaw) {
    try { meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw } catch {}
  }

  if (meta && meta.expires_at && Date.now() < meta.expires_at - 60000) {
    const token = await getDecryptedCredential(userId, 'google_calendar', 'access_token')
    if (token) return token
  }

  const refreshToken = await getDecryptedCredential(userId, 'google_calendar', 'refresh_token')
  if (!refreshToken) throw new Error('No refresh token found')

  const tokens = await refreshAccessToken(refreshToken)

  await storeCredential(userId, 'google_calendar', 'access_token', tokens.access_token)
  await storeCredential(userId, 'google_calendar', 'token_metadata', JSON.stringify({
    email: meta?.email || '',
    expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
    scope: tokens.scope || meta?.scope || '',
  }))

  return tokens.access_token
}

export function corsHeaders(req, res) {
  const allowedOrigins = ['http://localhost:5173', 'https://www.mitiendavirtual.cl', 'https://mitiendavirtual.cl']
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

export async function verifyUser(req) {
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!auth) return null
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${auth}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
  })
  if (!res.ok) return null
  const user = await res.json()
  return user?.id ? user : null
}

export async function supabaseRest(method, path, body) {
  const opts = { method, headers: SB_HEADERS }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts)
  if (!res.ok) return null
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}
