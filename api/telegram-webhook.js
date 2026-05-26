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

  // Try to extract link token from /start and resolve user_id server-side
  let resolvedUserId = null
  let linkToken = null
  try {
    const text = (body && ((body.message && body.message.text) || (body.message && body.message.caption))) || ''
    // 1) If /start with token, try resolve by token
    if (text && typeof text === 'string' && text.startsWith('/start')) {
      linkToken = text.replace('/start', '').trim()
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        if (linkToken) {
          const restUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens?token=eq.${encodeURIComponent(linkToken)}&select=user_id,used,expires_at,created_at`
          const lookup = await fetch(restUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              Accept: 'application/json'
            }
          })
          if (lookup.ok) {
            const rows = await lookup.json().catch(() => [])
            if (Array.isArray(rows) && rows.length > 0) {
              const row = rows[0]
              if (!row.expires_at || new Date(row.expires_at) > new Date()) {
                resolvedUserId = row.user_id || null
              }
            }
          } else {
            console.warn('telegram-webhook: token lookup request failed', lookup.status)
          }
        }

        // 2) If not found by token, try resolve by chat_id (existing link)
        if (!resolvedUserId) {
          const chatId = (body && body.message && (body.message.chat && (body.message.chat.id || body.message.chat.username))) || (body && body.callback_query && body.callback_query.message && body.callback_query.message.chat && body.callback_query.message.chat.id) || null
          if (chatId) {
            const restUrl2 = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens?chat_id=eq.${encodeURIComponent(String(chatId))}&select=user_id,used,telegram_username,created_at&order=created_at.desc&limit=1`
            const lookup2 = await fetch(restUrl2, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                Accept: 'application/json'
              }
            })
            if (lookup2.ok) {
              const rows2 = await lookup2.json().catch(() => [])
              if (Array.isArray(rows2) && rows2.length > 0) {
                const r = rows2[0]
                if (r && r.used) resolvedUserId = r.user_id || null
              }
            }
          }
        }
      } catch (err) {
        console.warn('telegram-webhook: lookup failed', err)
      }
    }
  } catch (err) {
    console.warn('telegram-webhook: token parse failed', err)
  }

  // If no n8n target configured, log and return OK (Vercel = example only).
  if (!N8N_WEBHOOK_URL) {
    console.warn('N8N_WEBHOOK_URL not set — acting as sample webhook (no forwarding).')
    console.log('Telegram update (sample):', JSON.stringify(body).slice(0, 2000))
    return res.status(200).json({ ok: true })
  }

  // If we resolved a user (by token or chat_id), check whether that user's
  // telegram_link_tokens contains an active (used = true) row. If no active
  // token exists we skip forwarding (we preserve DB rows for analytics).
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const chatId = (body && body.message && (body.message.chat && (body.message.chat.id || body.message.chat.username))) || (body && body.callback_query && body.callback_query.message && body.callback_query.message.chat && body.callback_query.message.chat.id) || null

      let hasActive = false

      if (resolvedUserId) {
        const checkUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens?user_id=eq.${resolvedUserId}&used=eq.true&select=chat_id&limit=1`
        const checkRes = await fetch(checkUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' }
        })
        if (checkRes.ok) {
          const rows = await checkRes.json().catch(() => [])
          if (Array.isArray(rows) && rows.length > 0) hasActive = true
        }
      }

      if (!hasActive && chatId) {
        const checkUrl2 = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens?chat_id=eq.${encodeURIComponent(String(chatId))}&used=eq.true&select=user_id&limit=1`
        const checkRes2 = await fetch(checkUrl2, {
          method: 'GET',
          headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' }
        })
        if (checkRes2.ok) {
          const rows2 = await checkRes2.json().catch(() => [])
          if (Array.isArray(rows2) && rows2.length > 0) hasActive = true
        }
      }

      if (!hasActive) {
        // No active token found -> skip forwarding
        return res.status(200).json({ ok: true, forwarded: false, reason: 'no_active_token' })
      }
    }
  } catch (err) {
    console.warn('telegram-webhook: active token lookup failed', err)
  }

  // Forward the original update to n8n. n8n workflows should handle linking and messages.
  try {
    const payload = {
      forwarded_by: 'vercel-telegram-proxy',
      forwarded_at: new Date().toISOString(),
      update: body,
      ...(linkToken ? { link_token: linkToken } : {}),
      ...(resolvedUserId ? { user_id: resolvedUserId } : {})
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
