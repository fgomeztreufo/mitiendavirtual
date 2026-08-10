import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = ['https://mitiendavirtual.cl', 'https://www.mitiendavirtual.cl', 'http://localhost:5173']
const COOLDOWN_MINUTES = 15

function setCors(req, res) {
  const origin = req.headers.origin || ''
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
}

function n8nBase() {
  return (process.env.N8N_WEBHOOK_URL || 'https://webhook.mitiendavirtual.cl').replace(/\/$/, '')
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

async function authUser(req) {
  const bearerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!bearerToken) return null
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data: { user }, error } = await supabase.auth.getUser(bearerToken)
  if (error || !user) return null
  return user
}

function serviceClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET ?action=scan — fetch IG media
async function handleScan(req, res, user) {
  const supa = serviceClient()
  const { data: instance } = await supa
    .from('instances')
    .select('provider_id, access_token')
    .eq('user_id', user.id)
    .single()

  if (!instance?.provider_id || !instance?.access_token) {
    return res.status(404).json({ message: 'Instagram no conectado' })
  }

  const limit = Math.min(parseInt(req.query.limit) || 30, 50)
  const after = req.query.after || ''

  let url = `https://graph.facebook.com/v25.0/${instance.provider_id}/media`
    + `?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,permalink`
    + `&limit=${limit}`
  if (after) url += `&after=${encodeURIComponent(after)}`

  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${instance.access_token}` }
    })
    const data = await r.json()

    if (data.error) {
      if (data.error.code === 190) {
        return res.status(401).json({ message: 'Token de Instagram expirado', code: 'TOKEN_EXPIRED' })
      }
      console.error('Instagram Graph API error:', data.error)
      return res.status(r.status).json({ message: data.error.message, code: 'GRAPH_ERROR' })
    }

    return res.status(200).json(data)
  } catch (err) {
    console.error('instagram-scan error:', err)
    return res.status(502).json({ message: 'Error al conectar con Instagram' })
  }
}

// POST ?action=classify — AI classification via n8n
async function handleClassify(req, res, user) {
  const supa = serviceClient()

  const { data: lastScan } = await supa
    .from('ig_scan_log')
    .select('scanned_at')
    .eq('user_id', user.id)
    .order('scanned_at', { ascending: false })
    .limit(1)
    .single()

  if (lastScan) {
    const elapsed = (Date.now() - new Date(lastScan.scanned_at).getTime()) / 60000
    if (elapsed < COOLDOWN_MINUTES) {
      const wait = Math.ceil(COOLDOWN_MINUTES - elapsed)
      return res.status(429).json({ message: `Espera ${wait} minutos antes de escanear de nuevo`, code: 'COOLDOWN', waitMinutes: wait })
    }
  }

  const body = await parseBody(req)
  const posts = body.posts
  if (!Array.isArray(posts) || posts.length === 0) {
    return res.status(400).json({ message: 'No posts to classify' })
  }

  const url = process.env.N8N_IG_CLASSIFY_URL || `${n8nBase()}/webhook/ig-classify-products`
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, posts })
    })

    if (!r.ok) {
      console.error('n8n ig-classify error:', r.status)
      return res.status(502).json({ message: 'Error al clasificar productos' })
    }

    const result = await r.json()

    await supa.from('ig_scan_log').insert({
      user_id: user.id,
      posts_found: posts.length,
      products_classified: Array.isArray(result) ? result.filter(p => p.classification === 'product').length : 0
    })

    return res.status(200).json(result)
  } catch (err) {
    console.error('instagram-classify error:', err)
    return res.status(502).json({ message: 'Error al clasificar productos' })
  }
}

// POST ?action=import — import selected products via n8n
async function handleImport(req, res, user) {
  const body = await parseBody(req)
  const products = body.products
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: 'No products to import' })
  }

  const supa = serviceClient()

  const { data: profile } = await supa
    .from('profiles')
    .select('current_products, plan_type')
    .eq('id', user.id)
    .single()

  const { data: plan } = await supa
    .from('plans')
    .select('products_limit')
    .eq('code', profile?.plan_type || 'free')
    .single()

  const currentCount = profile?.current_products || 0
  const limit = plan?.products_limit || 10
  const remaining = Math.max(limit - currentCount, 0)

  if (products.length > remaining) {
    return res.status(409).json({
      message: `Solo tienes ${remaining} cupos disponibles de ${limit}`,
      code: 'LIMIT_EXCEEDED',
      remaining
    })
  }

  const { data: existing } = await supa
    .from('products')
    .select('ig_post_id')
    .eq('user_id', user.id)
    .in('ig_post_id', products.map(p => p.igPostId).filter(Boolean))

  const existingIds = new Set((existing || []).map(e => e.ig_post_id))
  const newProducts = products.filter(p => !existingIds.has(p.igPostId))

  if (newProducts.length === 0) {
    return res.status(200).json({ imported: 0, skipped: products.length, message: 'Todos los productos ya fueron importados' })
  }

  const url = process.env.N8N_IG_IMPORT_URL || `${n8nBase()}/webhook/ig-import-products`
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, products: newProducts })
    })

    if (!r.ok) {
      console.error('n8n ig-import error:', r.status)
      return res.status(502).json({ message: 'Error al importar productos' })
    }

    const result = await r.json()

    await supa
      .from('ig_scan_log')
      .update({ products_imported: newProducts.length })
      .eq('user_id', user.id)
      .order('scanned_at', { ascending: false })
      .limit(1)

    return res.status(200).json({
      imported: result.imported || newProducts.length,
      skipped: products.length - newProducts.length,
      newCount: result.newCount
    })
  } catch (err) {
    console.error('instagram-import error:', err)
    return res.status(502).json({ message: 'Error al importar productos' })
  }
}

export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const user = await authUser(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  const action = req.query.action || (req.method === 'GET' ? 'scan' : '')

  switch (action) {
    case 'scan':
      if (req.method !== 'GET') return res.status(405).json({ message: 'GET required for scan' })
      return handleScan(req, res, user)
    case 'classify':
      if (req.method !== 'POST') return res.status(405).json({ message: 'POST required for classify' })
      return handleClassify(req, res, user)
    case 'import':
      if (req.method !== 'POST') return res.status(405).json({ message: 'POST required for import' })
      return handleImport(req, res, user)
    default:
      return res.status(400).json({ message: 'action required: scan, classify, or import' })
  }
}
