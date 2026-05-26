// API: deactivate Telegram linkage for a user without deleting records.
// - Marks telegram_link_tokens.used = false for the user's active tokens (or specific chat_id)
// - Calls the central n8n webhook to notify the workflow to deactivate processing for that chat/user

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || ''

function getMissingConfig() {
  const missing = []
  if (!SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  return missing
}

async function verifySession(authHeader) {
  if (!authHeader) return null
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_SERVICE_ROLE_KEY }
    })
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const missing = getMissingConfig()
  if (missing.length > 0) {
    console.error('Missing required env vars for telegram-deactivate:', missing.join(', '))
    return res.status(500).json({ message: 'Server misconfiguration', missing })
  }

  const authHeader = req.headers.authorization || ''
  const user = await verifySession(authHeader)
  if (!user || !user.id) return res.status(401).json({ message: 'Unauthorized' })

  let body = req.body || {}
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

  const userId = user.id
  const chatId = body.chat_id || null

  try {
    let updateUrl = ''
    let query = ''
    if (chatId) {
      updateUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens?chat_id=eq.${encodeURIComponent(String(chatId))}`
      query = `chat_id=${String(chatId)}`
    } else {
      // IMPORTANT: update ALL tokens for this user_id (incluye admin), per specification
      updateUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens?user_id=eq.${userId}`
      query = `user_id=${userId}`
    }

    // Mark used = false (preserve rows for analytics)
    const patchRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify({ used: false })
    })

    if (!patchRes.ok) {
      const txt = await patchRes.text().catch(() => '')
      console.error('Failed updating telegram_link_tokens', patchRes.status, txt)
      // Continue — do not block the user, but return an error
      return res.status(502).json({ message: 'Failed updating tokens', detail: txt })
    }

    const updatedRows = await patchRes.json().catch(() => [])

    // Notify central webhook so automation can stop processing messages for this chat/user
    try {
      if (N8N_WEBHOOK_URL) {
        const bodyToSend = { action: 'deactivate', user_id: userId, chat_id: chatId || null }
        const notify = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyToSend)
        })
        if (!notify.ok) {
          const txt = await notify.text().catch(() => '')
          console.warn('telegram-deactivate: central webhook responded', notify.status, txt)
        }
      }
    } catch (err) {
      console.warn('telegram-deactivate: notify failed', err)
    }

    return res.status(200).json({ ok: true, updated: Array.isArray(updatedRows) ? updatedRows.length : 0 })
  } catch (err) {
    console.error('telegram-deactivate error', err)
    return res.status(500).json({ message: 'Internal error' })
  }
}
