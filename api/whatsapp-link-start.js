import { createClient } from '@supabase/supabase-js'
import { provisionTemplates } from './_lib/whatsapp-templates.js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

function n8nUrl(path) {
  return process.env['N8N_WPP_' + path.replace(/-/g, '_').toUpperCase() + '_URL']
    || (process.env.N8N_WPP_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || '').replace(/\/$/, '') + '/' + path
}

async function parseBody(req) {
  if (req.body) return req.body
  return new Promise((resolve) => {
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } })
    req.on('error', () => resolve({}))
  })
}

export default async function handler(req, res) {
  // 1. CONFIGURACIÓN DE CABECERAS CORS
  const allowedOrigins = ['http://localhost:5173', 'https://www.mitiendavirtual.cl', 'https://mitiendavirtual.cl'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // 2. MANEJO DEL PREFLIGHT (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = req.headers.authorization || ''

  // Flujo GET: Consulta estado de conexión existente
  if (req.method === 'GET') {
    const url = n8nUrl('wpp-status')
    if (!url.startsWith('http')) return res.status(500).json({ message: 'N8N_WPP_STATUS_URL no configurada.' })
    try {
      const r = await fetch(url, { method: 'GET', headers: auth ? { Authorization: auth } : {} })
      const text = await r.text()
      return res.status(r.status).send(text)
    } catch (err) {
      return res.status(502).json({ message: 'Service unavailable' })
    }
  }

  // Flujo POST: Registro / Modificación de número de negocio
  if (req.method === 'POST') {
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ message: 'SUPABASE_URL o SUPABASE_ANON_KEY no configuradas.' })
    }
    const token = auth.replace(/^Bearer\s+/i, '')
    if (!token) {
      return res.status(401).json({ message: 'Se requiere autenticación.' })
    }
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user }, error: authError } = await sb.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ message: 'Token inválido o sesión expirada.' })
    }

    const url = n8nUrl('wpp-link-start')
    if (!url.startsWith('http')) return res.status(500).json({ message: 'N8N_WPP_LINK_START_URL no configurada.' })
    const body = await parseBody(req)
    body.user_id = user.id
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (auth) headers.Authorization = auth
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
      const text = await r.text()

      if (r.status >= 200 && r.status < 300) {
        try {
          const { data: conn } = await sb
            .from('whatsapp_connections')
            .select('waba_id, access_token')
            .eq('user_id', user.id)
            .limit(1)
            .single()
          if (conn?.waba_id && conn?.access_token) {
            const tplResult = await provisionTemplates(conn.waba_id, conn.access_token)
            console.log('Template provisioning:', JSON.stringify(tplResult))
          }
        } catch (tplErr) {
          console.error('Template provisioning error:', tplErr.message || tplErr)
        }
      }

      return res.status(r.status).send(text)
    } catch (err) {
      return res.status(502).json({ message: 'Service unavailable' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ message: 'Method Not Allowed' })
}