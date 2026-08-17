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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || (process.env.VITE_TELEGRAM_BOT_USERNAME) || 'mi_tienda_virtual_bot'

async function resolveUserFromBearer(authHeader) {
  if (!authHeader || !SUPABASE_URL) return null
  try {
    const uRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_SERVICE_ROLE_KEY }
    })
    if (uRes.ok) {
      const u = await uRes.json()
      return u?.id ? u : null
    }
  } catch {}
  return null
}

async function getBotTokenForUser(userId) {
  if (!supabaseAdmin) return TELEGRAM_BOT_TOKEN
  const { data: inst } = await supabaseAdmin
    .from('instances')
    .select('id, channels')
    .eq('user_id', userId)
    .limit(1)

  if (inst && inst.length > 0 && inst[0].channels?.telegram?.bot_type === 'own') {
    const { data: cred } = await supabaseAdmin.rpc('get_decrypted_credential', {
      p_user_id: userId,
      p_instance_id: inst[0].id,
      p_provider: 'telegram',
      p_credential_type: 'bot_token'
    })
    if (cred) return cred
  }
  return TELEGRAM_BOT_TOKEN
}

async function handleChatState(req, res) {
  const authHeader = req.headers.authorization || ''
  const user = await resolveUserFromBearer(authHeader)
  if (!user?.id) return res.status(401).json({ message: 'Unauthorized' })

  const action = (req.query?.action || '').toLowerCase()
  const contactId = req.method === 'GET'
    ? req.query?.contact
    : (req.body?.contact_id || req.body?.chat_id)

  if (!contactId) return res.status(400).json({ message: 'contact_id es requerido.' })

  if (action === 'check-mode') {
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/chat_states?chat_id=eq.${encodeURIComponent(contactId)}&status=eq.human&select=id&limit=1`
    const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } })
    const data = await r.json().catch(() => [])
    return res.status(200).json({ mode: Array.isArray(data) && data.length > 0 ? 'human' : 'bot' })
  }

  if (action === 'takeover') {
    const checkUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/chat_states?chat_id=eq.${encodeURIComponent(contactId)}&select=id&limit=1`
    const checkRes = await fetch(checkUrl, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } })
    const existing = await checkRes.json().catch(() => [])

    if (Array.isArray(existing) && existing.length > 0) {
      await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/chat_states?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ status: 'human' })
      })
    } else {
      await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/chat_states`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ chat_id: contactId, status: 'human' })
      })
    }
    return res.status(200).json({ ok: true, mode: 'human' })
  }

  if (action === 'resume') {
    await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/chat_states?chat_id=eq.${encodeURIComponent(contactId)}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
    })
    return res.status(200).json({ ok: true, mode: 'bot' })
  }

  return res.status(400).json({ message: 'Acción no válida.' })
}

async function handleSend(req, res) {
  const authHeader = req.headers.authorization || ''
  if (!authHeader) return res.status(401).json({ message: 'Unauthorized' })

  const user = await resolveUserFromBearer(authHeader)
  if (!user?.id) return res.status(401).json({ message: 'Unauthorized' })

  let body = req.body
  if (!body) {
    try {
      body = await new Promise((resolve, reject) => {
        let data = ''
        req.on('data', c => { data += c })
        req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } })
        req.on('error', reject)
      })
    } catch { body = {} }
  }

  const message = (body.message || '').trim()
  if (!message) return res.status(400).json({ message: 'message is required' })

  const botToken = await getBotTokenForUser(user.id)
  if (!botToken) return res.status(500).json({ message: 'No bot token configured' })

  const contacts = body.contacts || (body.chat_id ? [body.chat_id] : [])
  if (contacts.length === 0) return res.status(400).json({ message: 'chat_id or contacts[] required' })
  if (contacts.length > 100) return res.status(400).json({ message: 'Max 100 contacts per request' })

  const isBulk = !!body.contacts
  const results = []
  let sent = 0, failed = 0

  for (const chatId of contacts) {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message })
      })
      const tgData = await tgRes.json()

      if (!tgRes.ok || !tgData.ok) {
        failed++
        results.push({ chat_id: chatId, ok: false, error: tgData.description || 'Telegram error' })
        continue
      }

      if (supabaseAdmin) {
        const msgId = tgData.result?.message_id
        await supabaseAdmin.from('telegram_messages').insert({
          user_id: user.id,
          chat_id: String(chatId),
          direction: 'outbound',
          body: message,
          sender_type: 'human',
          tg_message_id: msgId ? `${chatId}_${msgId}_human` : null
        }).then(() => {})
      }

      sent++
      results.push({ chat_id: chatId, ok: true })
    } catch (err) {
      failed++
      results.push({ chat_id: chatId, ok: false, error: err.message || 'Send failed' })
    }
  }

  if (isBulk) {
    return res.status(200).json({ ok: true, sent, failed, total: contacts.length, results })
  }
  if (results[0]?.ok) {
    return res.status(200).json({ ok: true })
  }
  return res.status(502).json({ message: results[0]?.error || 'Failed to send' })
}

// DELETE: deactivate Telegram linkage (merged from telegram-deactivate.js)
async function handleDeactivate(req, res) {
  const authHeader = req.headers.authorization || ''
  if (!authHeader) return res.status(401).json({ message: 'Unauthorized' })

  let user = null
  try {
    const uRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_SERVICE_ROLE_KEY }
    })
    if (uRes.ok) user = await uRes.json()
  } catch (_) {}
  if (!user?.id) return res.status(401).json({ message: 'Unauthorized' })

  let body = req.body
  if (!body) {
    try {
      body = await new Promise((resolve, reject) => {
        let data = ''
        req.on('data', c => { data += c })
        req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } })
        req.on('error', reject)
      })
    } catch { body = {} }
  }

  const chatId = body.chat_id || null
  const updateUrl = chatId
    ? `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens?chat_id=eq.${encodeURIComponent(String(chatId))}`
    : `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens?user_id=eq.${user.id}`

  try {
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
      return res.status(502).json({ message: 'Failed updating tokens', detail: txt })
    }

    const updatedRows = await patchRes.json().catch(() => [])

    try {
      const n8nUrl = process.env.N8N_WEBHOOK_URL
      if (n8nUrl) {
        await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deactivate', user_id: user.id, chat_id: chatId })
        }).catch(() => {})
      }
    } catch (_) {}

    return res.status(200).json({ ok: true, updated: Array.isArray(updatedRows) ? updatedRows.length : 0 })
  } catch (err) {
    console.error('telegram-deactivate error', err)
    return res.status(500).json({ message: 'Internal error' })
  }
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') return handleDeactivate(req, res)

  const action = (req.query?.action || '').toLowerCase()
  if (action === 'check-mode' || action === 'takeover' || action === 'resume') return handleChatState(req, res)
  if (action === 'send' && req.method === 'POST') return handleSend(req, res)

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE')
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
