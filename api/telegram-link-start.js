import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BOT_USERNAME = process.env.VITE_TELEGRAM_BOT_USERNAME || 'Mitiendavirtualclbot'

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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase envs')
    return res.status(500).json({ message: 'Server misconfiguration' })
  }

  // Verificar sesión con cliente Supabase (incluye apikey automáticamente)
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // Invalidar tokens anteriores no usados de este usuario
  await supabase
    .from('telegram_link_tokens')
    .update({ used: true })
    .eq('user_id', appUserId)
    .eq('used', false)

  // Insertar nuevo token (expira en 10 minutos)
  const { error } = await supabase.from('telegram_link_tokens').insert({
    user_id: appUserId,
    token: linkToken
  })

  if (error) {
    console.error('Error inserting token', error)
    return res.status(500).json({ message: 'DB error' })
  }

  const deepLink = `https://t.me/${BOT_USERNAME}?start=${linkToken}`
  return res.status(200).json({ url: deepLink, token: linkToken })
}
