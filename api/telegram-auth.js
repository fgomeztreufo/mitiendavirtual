import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN

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

function isValidTelegramAuth(data, botToken) {
  const tokenHash = crypto.createHash('sha256').update(botToken).digest()
  const secret = tokenHash
  const copy = { ...data }
  const hash = copy.hash
  delete copy.hash
  const keys = Object.keys(copy).sort()
  const checkString = keys.map(k => `${k}=${copy[k]}`).join('\n')
  const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex')
  return hmac === hash
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  let body
  try {
    body = await parseJsonBody(req)
  } catch (err) {
    return res.status(400).json({ message: 'Invalid JSON body' })
  }

  if (!body || typeof body !== 'object') return res.status(400).json({ message: 'Invalid body' })
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('Missing TELEGRAM_BOT_TOKEN in env')
    return res.status(500).json({ message: 'Server misconfiguration' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase envs')
    return res.status(500).json({ message: 'Server misconfiguration' })
  }

  if (!body.hash) return res.status(400).json({ message: 'Missing hash' })

  const now = Math.floor(Date.now() / 1000)
  if (body.auth_date && (now - Number(body.auth_date) > 86400)) {
    return res.status(403).json({ message: 'Auth data expired' })
  }

  const valid = isValidTelegramAuth(body, TELEGRAM_BOT_TOKEN)
  if (!valid) return res.status(403).json({ message: 'Invalid Telegram auth signature' })

  // Upsert into Supabase using service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const appUserId = body.app_user_id
  if (!appUserId) return res.status(400).json({ message: 'Missing app_user_id' })

  const chatId = body.id ? String(body.id) : null
  const username = body.username || body.first_name || ''

  try {
    const { error } = await supabase.from('user_notification_configs').upsert({
      user_id: appUserId,
      channel_type: 'telegram',
      is_active: true,
      config: {
        telegram_chat_id: chatId,
        telegram_username: username
      }
    }, { onConflict: 'user_id, channel_type' })

    if (error) {
      console.error('Supabase upsert error', error)
      return res.status(500).json({ message: 'DB error' })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Unexpected error', err)
    return res.status(500).json({ message: 'Unexpected error' })
  }
}
