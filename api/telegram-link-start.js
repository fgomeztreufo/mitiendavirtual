import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'Mitiendavirtualclbot'
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
// Secret compartido con Telegram para validar que los updates vienen de Telegram
// Se registra al hacer setWebhook. Guardar en Vercel como TELEGRAM_WEBHOOK_SECRET.
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ''

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase envs')
    return res.status(500).json({ message: 'Server misconfiguration' })
  }

  // Verificar sesión del usuario autenticado
  const authHeader = req.headers.authorization || ''
  const token = (typeof authHeader === 'string') ? (authHeader.split(' ')[1] || '') : ''
  if (!token) return res.status(401).json({ message: 'Missing Authorization token' })

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: { user: appUser }, error: sessionError } = await supabaseAdmin.auth.getUser(token)

  if (sessionError || !appUser?.id) {
    console.error('Invalid session', sessionError?.message)
    return res.status(401).json({ message: 'Invalid session' })
  }

  const appUserId = appUser.id

  // Generar token one-time único
  const linkToken = crypto.randomBytes(24).toString('hex')

  // Invalidar tokens anteriores no usados de este usuario
  await supabaseAdmin
    .from('telegram_link_tokens')
    .update({ used: true })
    .eq('user_id', appUserId)
    .eq('used', false)

  // Insertar nuevo token (expira en 10 minutos)
  const { error } = await supabaseAdmin.from('telegram_link_tokens').insert({
    user_id: appUserId,
    token: linkToken
  })

  if (error) {
    console.error('Error inserting token', error)
    return res.status(500).json({ message: 'DB error' })
  }

  // Registrar webhook en Telegram si aún no está apuntando a esta URL (idempotente)
  if (TELEGRAM_BOT_TOKEN) {
    try {
      const webhookUrl = 'https://mitiendavirtual.cl/api/telegram-webhook'
      const infoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
      const infoJson = await infoRes.json()
      if (infoJson?.result?.url !== webhookUrl) {
        const body = { url: webhookUrl }
        if (WEBHOOK_SECRET) body.secret_token = WEBHOOK_SECRET
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      }
    } catch (err) {
      console.error('setWebhook error (non-fatal)', err)
    }
  }

  const deepLink = `https://t.me/${BOT_USERNAME}?start=${linkToken}`
  return res.status(200).json({ url: deepLink, token: linkToken })
}
