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

  // If we have a service client and a user id, create a one-time token and persist
  if (supabaseAdmin && userId) {
    try {
      const token = randomBytes(24).toString('hex')
      const expiresAt = new Date(Date.now() + (body?.expires_in ? Number(body.expires_in) * 1000 : 10 * 60 * 1000))

      const { data, error } = await supabaseAdmin
        .from('telegram_link_tokens')
        .insert({ user_id: userId, token, expires_at: expiresAt.toISOString() })
        .select()
        .single()

      if (error) {
        console.error('Failed inserting telegram_link_tokens row', error)
      } else {
        const url = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`

        // fire-and-forget notify to n8n (keeps backward compatibility without blocking)
        if (N8N_LINK_START_URL) {
          try {
            void fetch(N8N_LINK_START_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
              body: JSON.stringify({ ...(body || {}), token })
            })
          } catch (err) {
            console.warn('Failed forwarding new token to n8n (ignored)', err)
          }
        }

        return res.status(200).json({ url, token })
      }
    } catch (err) {
      console.error('Error creating telegram link token', err)
      // fall through to forwarding
    }
  }

  // Fallback: forward request to n8n as before
  if (!N8N_LINK_START_URL) {
    console.error('Missing N8N_LINK_START_URL and unable to derive from N8N_WEBHOOK_URL')
    return res.status(500).json({ message: 'Server misconfiguration' })
  }

  try {
    const forwardRes = await fetch(N8N_LINK_START_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify(body || {})
    })

    const responseText = await forwardRes.text()

    if (!forwardRes.ok) {
      console.error('Failed forwarding telegram-link-start to n8n', forwardRes.status, responseText)
      return res.status(forwardRes.status).send(responseText || JSON.stringify({ message: 'Upstream error' }))
    }

    try {
      return res.status(200).json(responseText ? JSON.parse(responseText) : {})
    } catch {
      return res.status(200).send(responseText)
    }
  } catch (error) {
    console.error('Error forwarding telegram-link-start to n8n', error)
    return res.status(502).json({ message: 'Failed to reach automation service' })
  }
}
