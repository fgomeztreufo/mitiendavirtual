// Pure proxy → n8n WPP Status (GET) y WPP Link Start (POST).
// Zero logic here: n8n valida usuario, hace upsert/query en Supabase.

function n8nUrl(path) {
  return process.env['N8N_WPP_' + path.replace(/-/g, '_').toUpperCase() + '_URL']
    || (process.env.N8N_WEBHOOK_URL || '').replace(/\/$/, '') + '/' + path
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
  const auth = req.headers.authorization || ''

  if (req.method === 'GET') {
    const url = n8nUrl('wpp-status')
    if (!url.startsWith('http')) return res.status(500).json({ message: 'N8N_WPP_STATUS_URL not configured' })
    try {
      const r = await fetch(url, { method: 'GET', headers: auth ? { Authorization: auth } : {} })
      const text = await r.text()
      return res.status(r.status).send(text)
    } catch (err) {
      return res.status(502).json({ message: 'Service unavailable' })
    }
  }

  if (req.method === 'POST') {
    const url = n8nUrl('wpp-link-start')
    if (!url.startsWith('http')) return res.status(500).json({ message: 'N8N_WPP_LINK_START_URL not configured' })
    const body = await parseBody(req)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (auth) headers.Authorization = auth
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
      const text = await r.text()
      return res.status(r.status).send(text)
    } catch (err) {
      return res.status(502).json({ message: 'Service unavailable' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ message: 'Method Not Allowed' })
}
