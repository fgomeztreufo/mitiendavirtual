import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
const GRAPH_API = 'https://graph.facebook.com/v25.0'
const ALLOWED_ORIGINS = ['http://localhost:5173', 'https://www.mitiendavirtual.cl', 'https://mitiendavirtual.cl']

async function authUser(sb, req) {
  const bearerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!bearerToken) return null
  const { data: { user }, error } = await sb.auth.getUser(bearerToken)
  if (error || !user) return null
  return user
}

async function handleChatState(sb, req, res) {
  const user = await authUser(sb, req)
  if (!user) return res.status(401).json({ message: 'Se requiere autenticación.' })

  const action = (req.query?.action || '').toLowerCase()
  const contactId = req.method === 'GET'
    ? req.query?.contact
    : (req.body?.contact_id || req.body?.contact_ig_id)

  if (!contactId) return res.status(400).json({ message: 'contact_id es requerido.' })

  if (action === 'check-mode') {
    const { data } = await sb.from('chat_states').select('id').eq('instagram_id', contactId).eq('user_id', user.id).eq('status', 'human').limit(1)
    return res.status(200).json({ mode: data && data.length > 0 ? 'human' : 'bot' })
  }

  if (action === 'takeover') {
    const { data: existing } = await sb.from('chat_states').select('id').eq('instagram_id', contactId).eq('user_id', user.id).limit(1)
    if (existing && existing.length > 0) {
      await sb.from('chat_states').update({ status: 'human' }).eq('id', existing[0].id)
    } else {
      await sb.from('chat_states').insert({ instagram_id: contactId, user_id: user.id, status: 'human' })
    }
    return res.status(200).json({ ok: true, mode: 'human' })
  }

  if (action === 'resume') {
    await sb.from('chat_states').delete().eq('instagram_id', contactId).eq('user_id', user.id)
    return res.status(200).json({ ok: true, mode: 'bot' })
  }

  return res.status(400).json({ message: 'Acción no válida.' })
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  const sb = createClient(supabaseUrl, supabaseServiceKey)
  const action = (req.query?.action || '').toLowerCase()

  if (action === 'check-mode' || action === 'takeover' || action === 'resume') {
    return handleChatState(sb, req, res)
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  // Auth — Bearer token only (dashboard user)
  const bearerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!bearerToken) return res.status(401).json({ message: 'Se requiere autenticación.' })

  const { data: { user }, error: authError } = await sb.auth.getUser(bearerToken)
  if (authError || !user) return res.status(401).json({ message: 'Token inválido o sesión expirada.' })
  const userId = user.id

  // Instagram connection
  const { data: instance } = await sb
    .from('instances')
    .select('provider_id, access_token')
    .eq('user_id', userId)
    .not('access_token', 'is', null)
    .limit(1)
    .single()

  if (!instance?.access_token) {
    return res.status(404).json({ message: 'No hay conexión de Instagram activa.' })
  }

  // Validate message
  const { contacts, contact_ig_id, message } = req.body || {}

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'message es requerido.' })
  }
  if (message.length > 1000) {
    return res.status(400).json({ message: 'El mensaje no puede superar 1000 caracteres.' })
  }

  const cleanMessage = message
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()

  if (!cleanMessage) return res.status(400).json({ message: 'El mensaje no puede estar vacío.' })

  const targetContacts = Array.isArray(contacts) ? contacts : (contact_ig_id ? [contact_ig_id] : [])
  if (targetContacts.length === 0) {
    return res.status(400).json({ message: 'contact_ig_id o contacts[] es requerido.' })
  }
  if (targetContacts.length > 100) {
    return res.status(400).json({ message: 'Máximo 100 contactos por solicitud.' })
  }

  const results = []

  for (const cid of targetContacts) {
    if (!cid || typeof cid !== 'string') {
      results.push({ contact_ig_id: cid, ok: false, error: 'ID de contacto inválido.' })
      continue
    }

    try {
      const metaRes = await fetch(`${GRAPH_API}/${instance.provider_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${instance.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: { id: cid },
          message: { text: cleanMessage }
        })
      })

      const metaData = await metaRes.json().catch(() => ({}))

      if (!metaRes.ok) {
        const metaError = metaData?.error || {}
        let errorMsg = metaError.message || 'Error al enviar mensaje.'

        if (metaError.code === 190 || metaRes.status === 401) {
          errorMsg = 'El token de Instagram expiró. Reconecta tu cuenta.'
        } else if (metaError.code === 10 || metaError.error_subcode === 2534015) {
          errorMsg = 'Ventana de mensajes expirada. El contacto debe escribirte primero.'
        } else if (metaRes.status === 429) {
          errorMsg = 'Límite de mensajes alcanzado. Intenta más tarde.'
        }

        results.push({ contact_ig_id: cid, ok: false, error: errorMsg })
        continue
      }

      const igMessageId = metaData.message_id || null

      await sb.from('instagram_messages').insert({
        user_id: userId,
        ig_account_id: instance.provider_id,
        contact_ig_id: cid,
        direction: 'outbound',
        body: cleanMessage,
        sender_type: 'human',
        ig_message_id: igMessageId
      })

      results.push({ contact_ig_id: cid, ok: true, ig_message_id: igMessageId })
    } catch (err) {
      console.error(`instagram-send error for ${cid}:`, err.message)
      results.push({ contact_ig_id: cid, ok: false, error: 'Error interno.' })
    }
  }

  const singleMode = !Array.isArray(contacts)
  if (singleMode) {
    const r = results[0]
    if (r.ok) return res.status(200).json({ ok: true, ig_message_id: r.ig_message_id })
    return res.status(422).json({ ok: false, message: r.error })
  }

  return res.status(200).json({
    ok: results.every(r => r.ok),
    sent: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results
  })
}
