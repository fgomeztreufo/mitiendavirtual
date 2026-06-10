// Proxy incoming WhatsApp updates to n8n. n8n will handle business logic and linking.
const WHATSAPP_WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || ''
const N8N_WEBHOOK_URL = process.env.N8N_WPP_INBOUND_URL || process.env.N8N_WEBHOOK_URL || ''

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

    if (mode === 'subscribe' && verifyToken && WHATSAPP_WEBHOOK_SECRET && verifyToken === WHATSAPP_WEBHOOK_SECRET) {
      // Respond with challenge to verify webhook
      return res.status(200).send(challenge)
    }
    return res.status(403).send('Forbidden')
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  // Optional verification via a simple header (configurable)
  if (WHATSAPP_WEBHOOK_SECRET) {
    const incoming = req.headers['x-whatsapp-webhook-secret'] || req.headers['x-hub-signature'] || ''
    if (incoming && incoming !== WHATSAPP_WEBHOOK_SECRET) {
      console.warn('Invalid WhatsApp webhook secret')
      return res.status(401).json({ message: 'Unauthorized' })
    }
    // If a secret is configured but header not sent, continue (some setups don't send header)
  }

  let body
  try {
    body = await parseJsonBody(req)
  } catch (err) {
    console.warn('Invalid JSON in whatsapp-webhook', err)
    return res.status(400).json({ message: 'Invalid JSON' })
  }

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
