import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = ['https://mitiendavirtual.cl', 'https://www.mitiendavirtual.cl', 'http://localhost:5173']

function n8nUrl(path) {
  return process.env['N8N_WPP_' + path.replace(/-/g, '_').toUpperCase() + '_URL']
    || (process.env.N8N_WPP_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || '').replace(/\/$/, '') + '/' + path
}

function setCors(req, res) {
  const origin = req.headers.origin || ''
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
}

export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' })

  const bearerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!bearerToken) return res.status(401).json({ message: 'Unauthorized' })

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data: { user }, error } = await supabase.auth.getUser(bearerToken)
  if (error || !user) return res.status(401).json({ message: 'Unauthorized' })

  const url = n8nUrl('wpp-discover')
  if (!url.startsWith('http')) return res.status(500).json({ message: 'Service not configured' })
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: { Authorization: req.headers.authorization }
    })
    const text = await r.text()
    res.status(r.status)
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json')
    return res.send(text)
  } catch (err) {
    console.error('whatsapp-discover proxy error', err)
    return res.status(502).json({ message: 'Service unavailable' })
  }
}
