import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const N8N_LINK_START_URL = process.env.N8N_LINK_START_URL || deriveLinkStartUrl(process.env.N8N_WEBHOOK_URL || '')

function deriveLinkStartUrl(n8nWebhookUrl) {
  if (!n8nWebhookUrl) return ''
  return n8nWebhookUrl.replace(/telegram-central\/?$/, 'telegram-link-start')
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let supabaseAdmin = null
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || (process.env.VITE_TELEGRAM_BOT_USERNAME) || 'mi_tienda_virtual_bot'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  // Safely parse body (some server runtimes provide parsed body, others stream)
  let body = req.body
  if (!body) {
    try {
      body = await new Promise((resolve, reject) => {
        let data = ''
        req.on('data', chunk => { data += chunk })
        req.on('end', () => {
          try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) }
        })
        req.on('error', reject)
      })
    } catch {
      body = {}
    }
  }

  const authHeader = req.headers.authorization || ''
  const userIdFromBody = body?.user_id || body?.userId || body?.user || null
  let userId = userIdFromBody

  // Debug logging: surface incoming values for troubleshooting
  try {
    console.log('[telegram-link-start] incoming', {
      userIdFromBody,
      authHeader: authHeader ? '[REDACTED]' : '',
      bodySummary: typeof body === 'object' ? Object.keys(body).slice(0,10) : String(body)
    })
  } catch (e) {
    console.warn('[telegram-link-start] logging failed', e)
  }
  // If user_id not provided, try to resolve it from the bearer token via Supabase auth endpoint
  if (!userId && authHeader && SUPABASE_URL) {
    try {
      const uRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
        method: 'GET',
        headers: { Authorization: authHeader }
      })
      if (uRes.ok) {
        const uJson = await uRes.json().catch(() => ({}))
        userId = uJson?.id || (uJson?.user && uJson.user.id) || null
      }
    } catch (err) {
      // ignore — we'll fallback to forwarding to n8n
      console.warn('Could not resolve user from token locally', err)
    }
  }

  // If we have a resolved user_id, check whether the user's instance already
  // has a Telegram `bot_type: 'own'`. If so, block link-start to enforce
  // exclusivity (only own bot OR platform bot can be active).
  if (userId && supabaseAdmin) {
    try {
      const { data: instances, error } = await supabaseAdmin
        .from('instances')
        .select('channels')
        .eq('user_id', userId)
        .limit(1)

      if (!error && Array.isArray(instances) && instances.length > 0) {
        const channels = instances[0].channels || {}
        if (channels && channels.telegram && channels.telegram.bot_type === 'own') {
          return res.status(403).json({ message: 'Esta tienda tiene un bot propio activo; no puedes vincular con el bot compartido.' })
        }
      }
    } catch (err) {
      console.warn('telegram-link-start: instance check failed', err)
    }
  }

  // Proxy behavior: forward the incoming request to the configured n8n endpoint.
  // Ensure we forward the Authorization header and include `user_id` and `user_token`
  // in the forwarded body so n8n can act as the single orchestrator.
  if (!N8N_LINK_START_URL) {
    console.error('N8N_LINK_START_URL not configured; cannot proxy to n8n.')
    return res.status(500).json({ message: 'N8N_LINK_START_URL not configured' })
  }

  try {
    // Derive a user token from the Authorization header if present
    const bearerToken = authHeader && String(authHeader).startsWith('Bearer ') ? String(authHeader).slice(7) : (authHeader || '')

    // Build the forwarded body: include original body, ensure user_id and user_token present
    const forwardBody = Object.assign({}, (body && typeof body === 'object') ? body : {})
    if (!forwardBody.user_id && userId) forwardBody.user_id = userId
    if (!forwardBody.user_token && bearerToken) forwardBody.user_token = bearerToken

    const forwardHeaders = { 'Content-Type': 'application/json' }
    // Forward original Authorization header if present
    if (authHeader) forwardHeaders.Authorization = authHeader

    const forwardRes = await fetch(N8N_LINK_START_URL, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(forwardBody)
    })

    const responseText = await forwardRes.text()

    if (!forwardRes.ok) {
      console.error('Failed proxying telegram-link-start to n8n', forwardRes.status, responseText)
      return res.status(forwardRes.status).send(responseText || JSON.stringify({ message: 'Upstream error' }))
    }

    try {
      return res.status(200).json(responseText ? JSON.parse(responseText) : {})
    } catch {
      return res.status(200).send(responseText)
    }
  } catch (error) {
    console.error('Error proxying telegram-link-start to n8n', error)
    return res.status(502).json({ message: 'Failed to reach automation service' })
  }
}
