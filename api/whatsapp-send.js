import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
const GRAPH_API = 'https://graph.facebook.com/v25.0'
const WPP_TEMPLATE_SECRET = process.env.WPP_TEMPLATE_SECRET || ''
const ALLOWED_ORIGINS = ['http://localhost:5173', 'https://www.mitiendavirtual.cl', 'https://mitiendavirtual.cl']

function safeEqual(a, b) {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function buildReadableBody(templateName, params) {
  if (templateName === 'appointment_confirmation' && params.length >= 5) {
    return `Hola ${params[0]}, tu cita de ${params[1]} ha sido agendada para el ${params[2]} a las ${params[3]} con ${params[4]}. Si necesitas cancelar o reagendar, responde a este mensaje.`
  }
  return `[Template: ${templateName}] ${params.join(', ')}`
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wpp-template-secret')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ message: 'Configuración de servidor incompleta.' })
  }

  const sb = createClient(supabaseUrl, supabaseServiceKey)
  const mode = req.body?.type || 'text'

  // --- Auth ---
  let userId = null

  if (mode === 'template') {
    const templateSecret = req.headers['x-wpp-template-secret'] || ''
    const bearerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')

    if (templateSecret && WPP_TEMPLATE_SECRET && safeEqual(templateSecret, WPP_TEMPLATE_SECRET)) {
      userId = req.body?.user_id
      if (!userId) return res.status(400).json({ message: 'user_id requerido para auth server-to-server.' })
    } else if (bearerToken) {
      const { data: { user }, error: authError } = await sb.auth.getUser(bearerToken)
      if (authError || !user) return res.status(401).json({ message: 'Token inválido o sesión expirada.' })
      userId = user.id
    } else {
      return res.status(401).json({ message: 'Se requiere autenticación.' })
    }
  } else {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ message: 'Se requiere autenticación.' })
    const { data: { user }, error: authError } = await sb.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ message: 'Token inválido o sesión expirada.' })
    userId = user.id
  }

  // --- Validate input ---
  const { contact_phone } = req.body || {}
  if (!contact_phone || typeof contact_phone !== 'string') {
    return res.status(400).json({ message: 'contact_phone es requerido.' })
  }

  let metaPayload, dbBody, senderType

  if (mode === 'template') {
    const { template_name, template_language, components } = req.body || {}
    if (!template_name || typeof template_name !== 'string') {
      return res.status(400).json({ message: 'template_name es requerido.' })
    }

    metaPayload = {
      messaging_product: 'whatsapp',
      to: contact_phone,
      type: 'template',
      template: {
        name: template_name,
        language: { code: template_language || 'es' },
        components: components || []
      }
    }

    const bodyParams = (components || [])
      .find(c => c.type === 'body')
      ?.parameters?.map(p => p.text || '') || []
    dbBody = buildReadableBody(template_name, bodyParams)
    senderType = 'system'
  } else {
    const { message } = req.body || {}
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

    metaPayload = {
      messaging_product: 'whatsapp',
      to: contact_phone,
      type: 'text',
      text: { body: cleanMessage }
    }
    dbBody = cleanMessage
    senderType = 'human'
  }

  // --- Send via Meta Graph API ---
  try {
    const { data: conn, error: connErr } = await sb
      .from('whatsapp_connections')
      .select('phone_number_id, access_token, active')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (connErr || !conn) {
      return res.status(404).json({ message: 'No hay conexión de WhatsApp activa.' })
    }
    if (!conn.active) {
      return res.status(403).json({ message: 'La conexión de WhatsApp está pausada.' })
    }

    const metaRes = await fetch(`${GRAPH_API}/${conn.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metaPayload)
    })

    const metaData = await metaRes.json().catch(() => ({}))

    if (!metaRes.ok) {
      console.error('Meta send error:', metaData)
      const metaError = metaData?.error || {}

      if (metaError.code === 190 || metaRes.status === 401) {
        return res.status(401).json({ message: 'El token de WhatsApp expiró. Reconecta tu número.' })
      }
      if (mode === 'text' && (metaError.code === 131047 || metaError.error_subcode === 2494055)) {
        return res.status(422).json({
          message: 'Han pasado más de 24 horas desde el último mensaje del cliente. WhatsApp no permite enviar mensajes fuera de esta ventana.'
        })
      }
      if (mode === 'template' && metaError.code === 132000) {
        return res.status(422).json({
          message: 'Template no encontrado o no aprobado. Verifica en Meta Business Manager.'
        })
      }
      if (metaRes.status === 429 || metaError.code === 470) {
        return res.status(429).json({ message: 'Límite de mensajes alcanzado. Intenta más tarde.' })
      }

      return res.status(502).json({
        message: metaError.message || 'Error al enviar mensaje por WhatsApp.'
      })
    }

    const wamid = metaData.messages?.[0]?.id || null

    const { error: insertErr } = await sb
      .from('whatsapp_messages')
      .insert({
        user_id: userId,
        phone_number_id: conn.phone_number_id,
        contact_phone,
        direction: 'outbound',
        body: dbBody,
        wamid,
        sender_type: senderType
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
