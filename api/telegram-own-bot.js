// Vercel serverless: manage own Telegram bot setup for Pro/Full plans.
// POST: validate bot token, store encrypted, register webhook
// DELETE: remove webhook, delete credential

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
const SUPABASE_ENCRYPT_KEY = process.env.SUPABASE_ENCRYPT_KEY || process.env.SUPABASE_CREDENTIAL_ENCRYPT_KEY || ''
const OWN_BOT_WEBHOOK_URL = process.env.OWN_BOT_WEBHOOK_URL || 'https://webhook.mitiendavirtual.cl/webhook/telegram-own'

function getMissingConfig() {
  const missing = []
  if (!SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_ENCRYPT_KEY) missing.push('SUPABASE_ENCRYPT_KEY')
  return missing
}

async function verifySession(authHeader) {
  if (!authHeader) return null
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: SUPABASE_SERVICE_ROLE_KEY }
  })
  if (!res.ok) return null
  return res.json()
}

async function telegramGetMe(botToken) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
  const json = await res.json()
  if (!json.ok) return null
  return json.result // { id, is_bot, first_name, username }
}

async function telegramSetWebhook(botToken, instanceId) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: OWN_BOT_WEBHOOK_URL,
      secret_token: instanceId,
      allowed_updates: ['message']
    })
  })
  return res.json()
}

async function telegramDeleteWebhook(botToken) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drop_pending_updates: false })
  })
  return res.json()
}

async function storeCredential(userId, instanceId, botToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/store_integration_credential`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_instance_id: instanceId,
      p_provider: 'telegram',
      p_credential_type: 'bot_token',
      p_credential_value_text: botToken,
      p_encrypt_key: SUPABASE_ENCRYPT_KEY
    })
  })
  return res.ok
}

async function deleteCredential(userId, instanceId) {
  const url = `${SUPABASE_URL}/rest/v1/integration_credentials?user_id=eq.${userId}&instance_id=eq.${instanceId}&provider=eq.telegram&credential_type=eq.bot_token`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  })
  return res.ok
}

async function upsertInstanceChannel(instanceId, channelData) {
  // Read current channels, merge telegram key, then update
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/instances?id=eq.${instanceId}&select=channels`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  )
  const rows = await getRes.json()
  const currentChannels = (rows && rows[0] && rows[0].channels) || {}
  const merged = { ...currentChannels, telegram: { ...(currentChannels.telegram || {}), ...channelData } }

  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/instances?id=eq.${instanceId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ channels: merged })
    }
  )
  return patchRes.ok
}

async function getInstanceForUser(userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/instances?user_id=eq.${userId}&select=id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  )
  const rows = await res.json()
  return rows && rows[0] ? rows[0].id : null
}

export default async function handler(req, res) {
  if (!['POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'POST, DELETE')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const missing = getMissingConfig()
  if (missing.length > 0) {
    console.error('Missing required env vars for telegram-own-bot:', missing.join(', '))
    return res.status(500).json({
      message: 'Server misconfiguration',
      missing,
      hint: 'Configure these variables in Vercel Project Settings > Environment Variables'
    })
  }

  // Authenticate user
  const authHeader = req.headers.authorization || ''
  const user = await verifySession(authHeader)
  if (!user || !user.id) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const userId = user.id
  const body = req.body || {}
  const instanceId = body.instance_id || await getInstanceForUser(userId)

  if (!instanceId) {
    return res.status(400).json({ message: 'No instance found for user' })
  }

  // --- POST: Connect own bot ---
  if (req.method === 'POST') {
    const botToken = (body.bot_token || '').trim()
    if (!botToken || !botToken.includes(':')) {
      return res.status(400).json({ message: 'Invalid bot token format' })
    }

    // 1. Validate token with Telegram
    const botInfo = await telegramGetMe(botToken)
    if (!botInfo) {
      return res.status(400).json({ message: 'Token inválido. Verifica que el token sea correcto.' })
    }

    // 2. Store encrypted credential
    const stored = await storeCredential(userId, instanceId, botToken)
    if (!stored) {
      return res.status(500).json({ message: 'Error storing credential' })
    }

    // 3. Register webhook with secret_token = instance_id
    const webhookResult = await telegramSetWebhook(botToken, instanceId)
    if (!webhookResult.ok) {
      // Rollback credential
      await deleteCredential(userId, instanceId)
      return res.status(500).json({ message: 'Error registering webhook with Telegram', detail: webhookResult.description })
    }

    // 4. Update instance channels
    await upsertInstanceChannel(instanceId, {
      bot_type: 'own',
      bot_id: String(botInfo.id),
      bot_username: botInfo.username,
      connected_at: new Date().toISOString()
    })

    return res.status(200).json({
      ok: true,
      bot_username: botInfo.username,
      bot_id: botInfo.id
    })
  }

  // --- DELETE: Disconnect own bot ---
  if (req.method === 'DELETE') {
    // Get current bot token to call deleteWebhook
    const credRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_decrypted_credential`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          p_user_id: userId,
          p_instance_id: instanceId,
          p_provider: 'telegram',
          p_credential_type: 'bot_token',
          p_encrypt_key: SUPABASE_ENCRYPT_KEY
        })
      }
    )

    if (credRes.ok) {
      const decrypted = await credRes.json()
      if (decrypted) {
        await telegramDeleteWebhook(decrypted)
      }
    }

    // Delete credential
    await deleteCredential(userId, instanceId)

    // Reset instance channel
    await upsertInstanceChannel(instanceId, {
      bot_type: 'platform',
      bot_id: null,
      bot_username: null,
      disconnected_at: new Date().toISOString()
    })

    return res.status(200).json({ ok: true })
  }
}
