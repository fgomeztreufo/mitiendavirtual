// Pure proxy → n8n WPP Discover workflow.
// Zero logic here: n8n calls Graph API and formats the response.

const _placeholder = null

function n8nUrl(path) {
  return process.env['N8N_WPP_' + path.replace(/-/g, '_').toUpperCase() + '_URL']
    || (process.env.N8N_WEBHOOK_URL || '').replace(/\/$/, '') + '/' + path
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' })
  const url = n8nUrl('wpp-discover')
  if (!url.startsWith('http')) return res.status(500).json({ message: 'N8N_WPP_DISCOVER_URL not configured' })
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {}
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
