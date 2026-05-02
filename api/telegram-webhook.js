import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TELEGRAM_BOT_TOKEN) {
    console.error('Missing envs')
    return res.status(500).json({ message: 'Server misconfiguration' })
  }

  let body
  try {
    body = await parseJsonBody(req)
  } catch {
    return res.status(400).json({ message: 'Invalid JSON' })
  }

  // Procesar mensajes de Telegram
  const message = body?.message
  if (!message) return res.status(200).json({ ok: true })

  const chatId = String(message.chat?.id || '')
  const text = message.text || ''
  const from = message.from || {}
  const username = from.username || from.first_name || ''

  // Solo procesar /start <token>
  if (!text.startsWith('/start ') && text !== '/start') {
    return res.status(200).json({ ok: true })
  }

  const linkToken = text.replace('/start', '').trim()
  if (!linkToken) {
    // /start sin token — responder con mensaje genérico
    await sendTelegramMessage(chatId, '👋 Bienvenido a MiTiendaVirtual. Vincula tu cuenta desde la app.', TELEGRAM_BOT_TOKEN)
    return res.status(200).json({ ok: true })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // Buscar token válido no usado y no expirado
  const { data: tokenRow, error: tokenError } = await supabase
    .from('telegram_link_tokens')
    .select('*')
    .eq('token', linkToken)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (tokenError || !tokenRow) {
    await sendTelegramMessage(chatId, '⚠️ El enlace de vinculación no es válido o ya expiró. Genera uno nuevo desde la app.', TELEGRAM_BOT_TOKEN)
    return res.status(200).json({ ok: true })
  }

  const appUserId = tokenRow.user_id

  // Marcar token como usado
  await supabase
    .from('telegram_link_tokens')
    .update({ used: true, chat_id: chatId, telegram_username: username })
    .eq('id', tokenRow.id)

  // Upsert en user_notification_configs
  const { error: upsertError } = await supabase
    .from('user_notification_configs')
    .upsert({
      user_id: appUserId,
      channel_type: 'telegram',
      is_active: true,
      config: {
        telegram_chat_id: chatId,
        telegram_username: username,
        connected_at: new Date().toISOString()
      }
    }, { onConflict: 'user_id, channel_type' })

  if (upsertError) {
    console.error('Upsert error', upsertError)
    await sendTelegramMessage(chatId, '❌ Ocurrió un error al vincular. Intenta de nuevo.', TELEGRAM_BOT_TOKEN)
    return res.status(200).json({ ok: true })
  }

  await sendTelegramMessage(chatId, '✅ ¡Tu cuenta de MiTiendaVirtual fue vinculada exitosamente! Recibirás notificaciones aquí.', TELEGRAM_BOT_TOKEN)
  return res.status(200).json({ ok: true })
}

async function sendTelegramMessage(chatId, text, botToken) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    })
  } catch (err) {
    console.error('sendMessage error', err)
  }
}
