// Thin Vercel proxy: forward Telegram updates to an n8n webhook.
// Keep logic in n8n workflows (TLG Webhook Central, TLG Link Start, etc.).
// Configure `N8N_WEBHOOK_URL` in Vercel to point to your n8n HTTP trigger.
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ''
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || ''

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  // Verify secret token from Telegram (if configured)
  if (TELEGRAM_WEBHOOK_SECRET) {
    const incoming = req.headers['x-telegram-bot-api-secret-token'] || ''
    if (incoming !== TELEGRAM_WEBHOOK_SECRET) {
      console.warn('Invalid Telegram secret token')
      return res.status(401).json({ message: 'Unauthorized' })
    }
  }

  let body
  try {
    body = await parseJsonBody(req)
  } catch {
    return res.status(400).json({ message: 'Invalid JSON' })
  }

  // If no n8n target configured, log and return OK (Vercel = example only).
  if (!N8N_WEBHOOK_URL) {
    console.warn('N8N_WEBHOOK_URL not set — acting as sample webhook (no forwarding).')
    console.log('Telegram update (sample):', JSON.stringify(body).slice(0, 2000))
    return res.status(200).json({ ok: true })
  }

  // Forward the original update to n8n. n8n workflows should handle linking and messages.
  try {
    const payload = {
      forwarded_by: 'vercel-telegram-proxy',
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
    console.error('Error forwarding to n8n', err)
  }

  return res.status(200).json({ ok: true })
}
