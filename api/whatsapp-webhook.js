import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const WHATSAPP_WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || ''
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || ''
const N8N_WEBHOOK_URL = process.env.N8N_WPP_INBOUND_URL || process.env.N8N_WEBHOOK_URL || ''
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function logInboundMessages(body) {
  if (!supabaseUrl || !supabaseServiceKey) return
  try {
    const entries = body?.entry || []
    for (const entry of entries) {
      const changes = entry?.changes || []
      for (const change of changes) {
        if (change?.field !== 'messages') continue
        const value = change?.value || {}
        const phoneNumberId = value?.metadata?.phone_number_id
        const messages = value?.messages || []
        if (!phoneNumberId || messages.length === 0) continue

        const sb = createClient(supabaseUrl, supabaseServiceKey)
        const { data: conn } = await sb
          .from('whatsapp_connections')
          .select('user_id')
          .eq('phone_number_id', phoneNumberId)
          .eq('active', true)
          .limit(1)
          .single()
        if (!conn?.user_id) continue

        for (const msg of messages) {
          if (!msg.id || !msg.from) continue
          const textBody = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title || ''
          if (!textBody) continue
          await sb.from('whatsapp_messages').upsert({
            user_id: conn.user_id,
            phone_number_id: phoneNumberId,
            contact_phone: msg.from,
            direction: 'inbound',
            body: textBody,
            wamid: msg.id,
            created_at: msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000).toISOString() : new Date().toISOString()
          }, { onConflict: 'wamid', ignoreDuplicates: true })
        }
      }
    }
  } catch (err) {
    console.error('logInboundMessages error (non-blocking):', err.message)
  }
}

function safeEqual(a, b) {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) return resolve(req.body)
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) } catch (err) { reject(err) }
    })
    req.on('error', reject)
  })
}

function parseQuery(req) {
  try {
    const host = req.headers && req.headers.host ? `https://${req.headers.host}` : 'https://example.com'
    const u = new URL(req.url, host)
    const qp = {}
    for (const [k, v] of u.searchParams.entries()) qp[k] = v
    return qp
  } catch (err) {
    return (req.query || {})
  }
}

export default async function handler(req, res) {
  // Handle Meta webhook verification (GET with hub.challenge)
  if (req.method === 'GET') {
    const q = parseQuery(req)
    const mode = q['hub.mode'] || q['mode'] || ''
    const challenge = q['hub.challenge'] || q['challenge'] || ''
    const verifyToken = q['hub.verify_token'] || q['verify_token'] || q['verifyToken'] || ''

    if (mode === 'subscribe' && verifyToken && WHATSAPP_WEBHOOK_SECRET && safeEqual(verifyToken, WHATSAPP_WEBHOOK_SECRET)) {
      return res.status(200).send(challenge)
    }
    return res.status(403).send('Forbidden')
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  // Verify Meta HMAC signature if app secret is configured
  if (WHATSAPP_APP_SECRET) {
    const signature = req.headers['x-hub-signature-256'] || ''
    if (!signature) {
      return res.status(401).json({ message: 'Missing signature' })
    }
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || '')
    const expected = 'sha256=' + crypto.createHmac('sha256', WHATSAPP_APP_SECRET).update(rawBody).digest('hex')
    if (!safeEqual(signature, expected)) {
      console.warn('Invalid WhatsApp HMAC signature')
      return res.status(401).json({ message: 'Unauthorized' })
    }
  } else if (WHATSAPP_WEBHOOK_SECRET) {
    const incoming = req.headers['x-whatsapp-webhook-secret'] || ''
    if (!incoming || !safeEqual(incoming, WHATSAPP_WEBHOOK_SECRET)) {
      console.warn('Invalid or missing WhatsApp webhook secret')
      return res.status(401).json({ message: 'Unauthorized' })
    }
  }

  let body
  try {
    body = await parseJsonBody(req)
  } catch (err) {
    console.warn('Invalid JSON in whatsapp-webhook', err)
    return res.status(400).json({ message: 'Invalid JSON' })
  }

  await logInboundMessages(body)

  if (!N8N_WEBHOOK_URL) {
    console.warn('N8N_WEBHOOK_URL not set — acting as sample webhook (no forwarding).')
    console.log('WhatsApp update (sample):', JSON.stringify(body).slice(0, 2000))
    return res.status(200).json({ ok: true })
  }

  try {
    const payload = {
      forwarded_by: 'vercel-whatsapp-proxy',
      forwarded_at: new Date().toISOString(),
      update: body
    }

    const forwardRes = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!forwardRes.ok) {
      const txt = await forwardRes.text().catch(() => '')
      console.error('n8n forward error', forwardRes.status, txt)
    }
  } catch (err) {
    console.error('Error forwarding WhatsApp update to n8n', err)
  }

  return res.status(200).json({ ok: true })
}
