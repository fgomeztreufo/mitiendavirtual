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

function parseQuery(req) {
  try {
    const host = req.headers?.host ? `https://${req.headers.host}` : 'https://example.com'
    const u = new URL(req.url, host)
    const qp = {}
    for (const [k, v] of u.searchParams.entries()) qp[k] = v
    return qp
  } catch {
    return req.query || {}
  }
}

async function handleDiscover(req, res) {
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

async function handleMetaNumbers(req, res) {
  const auth = req.headers.authorization || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ message: 'Missing Authorization: Bearer <META_ACCESS_TOKEN>' })

  try {
    const wabaRes = await fetch(
      'https://graph.facebook.com/v25.0/me/whatsapp_business_accounts?fields=id,name,currency,message_template_namespace',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const wabaJson = await wabaRes.json()

    if (wabaJson.error) {
      return res.status(wabaRes.status).json({
        message: 'Meta API error fetching WABAs',
        meta_error: wabaJson.error
      })
    }

    const wabas = wabaJson.data || []
    if (!wabas.length) {
      const bizRes = await fetch(
        'https://graph.facebook.com/v25.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name}',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const bizJson = await bizRes.json()
      const bizWabas = (bizJson.data || []).flatMap(
        b => b.owned_whatsapp_business_accounts?.data || []
      )
      if (bizWabas.length) wabas.push(...bizWabas)
    }

    if (!wabas.length) {
      return res.status(200).json({
        message: 'No WhatsApp Business Accounts found for this token',
        numbers: [],
        wabas: []
      })
    }

    const numbers = []
    for (const waba of wabas) {
      const phoneRes = await fetch(
        `https://graph.facebook.com/v25.0/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,platform_type,code_verification_status`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const phoneJson = await phoneRes.json()

      if (phoneJson.error) {
        numbers.push({
          waba_id: waba.id,
          waba_name: waba.name,
          error: phoneJson.error.message
        })
        continue
      }

      for (const phone of (phoneJson.data || [])) {
        numbers.push({
          phone_number_id: phone.id,
          waba_id: waba.id,
          waba_name: waba.name,
          display_phone_number: phone.display_phone_number,
          verified_name: phone.verified_name,
          quality_rating: phone.quality_rating,
          platform_type: phone.platform_type,
          code_verification_status: phone.code_verification_status
        })
      }
    }

    return res.status(200).json({ numbers, wabas })
  } catch (err) {
    console.error('whatsapp-meta-numbers error', err)
    return res.status(500).json({ message: 'Internal error' })
  }
}

export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' })

  const q = parseQuery(req)

  if (q.action === 'meta-numbers') return handleMetaNumbers(req, res)
  return handleDiscover(req, res)
}
