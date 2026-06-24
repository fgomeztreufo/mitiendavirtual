import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ message: 'Configuración de servidor incompleta.' })
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ message: 'Se requiere autenticación.' })

  const sbAuth = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error: authError } = await sbAuth.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ message: 'Token inválido o sesión expirada.' })
  }

  try {
    const { data: connections, error: fetchErr } = await sbAuth
      .from('whatsapp_connections')
      .select('id, phone_number_id, waba_id')
      .eq('user_id', user.id)

    if (fetchErr) throw fetchErr
    if (!connections || connections.length === 0) {
      return res.status(404).json({ message: 'No hay conexión de WhatsApp para desvincular.' })
    }

    const { error: deleteErr } = await sbAuth
      .from('whatsapp_connections')
      .delete()
      .eq('user_id', user.id)

    if (deleteErr) throw deleteErr

    return res.status(200).json({ ok: true, deleted: connections.length })
  } catch (err) {
    console.error('whatsapp-disconnect error:', err)
    return res.status(500).json({ message: 'Error al desvincular WhatsApp.' })
  }
}
