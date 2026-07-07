import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
const GRAPH_API = 'https://graph.facebook.com/v25.0'

export default async function handler(req, res) {
  const allowedOrigins = ['http://localhost:5173', 'https://www.mitiendavirtual.cl', 'https://mitiendavirtual.cl']
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const missing = []
  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (missing.length) {
    return res.status(500).json({ message: `Configuración de servidor incompleta: ${missing.join(', ')}` })
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ message: 'Se requiere autenticación.' })

  const sb = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error: authError } = await sb.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ message: 'Token inválido o sesión expirada.' })
  }

  const { contact_phone, message } = req.body || {}

  if (!contact_phone || typeof contact_phone !== 'string') {
    return res.status(400).json({ message: 'contact_phone es requerido.' })
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'message es requerido.' })
  }
  if (message.length > 4096) {
    return res.status(400).json({ message: 'El mensaje no puede superar 4096 caracteres.' })
  }

  const cleanMessage = message
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()

  if (!cleanMessage) {
    return res.status(400).json({ message: 'El mensaje no puede estar vacío.' })
  }

  try {
    const { data: conn, error: connErr } = await sb
      .from('whatsapp_connections')
      .select('phone_number_id, access_token, active')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (connErr || !conn) {
      return res.status(404).json({ message: 'No hay conexión de WhatsApp. Conecta tu número en la sección WhatsApp.' })
    }
    if (!conn.active) {
      return res.status(403).json({ message: 'Tu conexión de WhatsApp está pausada. Actívala antes de enviar mensajes.' })
    }

    const metaRes = await fetch(`${GRAPH_API}/${conn.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: contact_phone,
        type: 'text',
        text: { body: cleanMessage }
      })
    })

    const metaData = await metaRes.json().catch(() => ({}))

    if (!metaRes.ok) {
      console.error('Meta send error:', metaData)
      const metaError = metaData?.error || {}

      if (metaError.code === 131047 || metaError.error_subcode === 2494055) {
        return res.status(422).json({
          message: 'Han pasado más de 24 horas desde el último mensaje del cliente. WhatsApp no permite enviar mensajes fuera de esta ventana.'
        })
      }
      if (metaRes.status === 401 || metaError.code === 190) {
        return res.status(401).json({
          message: 'El token de WhatsApp expiró. Reconecta tu número en la sección WhatsApp.'
        })
      }

      return res.status(502).json({
        message: metaError.message || 'Error al enviar mensaje por WhatsApp.'
      })
    }

    const wamid = metaData.messages?.[0]?.id || null

    const { error: insertErr } = await sb
      .from('whatsapp_messages')
      .insert({
        user_id: user.id,
        phone_number_id: conn.phone_number_id,
        contact_phone,
        direction: 'outbound',
        body: cleanMessage,
        wamid,
        sender_type: 'human'
      })

    if (insertErr) {
      console.error('DB insert error (message was sent):', insertErr)
    }

    return res.status(200).json({ ok: true, wamid })
  } catch (err) {
    console.error('whatsapp-send error:', err)
    return res.status(500).json({ message: 'Error al enviar mensaje.' })
  }
}
