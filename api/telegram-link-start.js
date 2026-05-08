const N8N_LINK_START_URL = process.env.N8N_LINK_START_URL || deriveLinkStartUrl(process.env.N8N_WEBHOOK_URL || '')

function deriveLinkStartUrl(n8nWebhookUrl) {
  if (!n8nWebhookUrl) return ''
  return n8nWebhookUrl.replace(/telegram-central\/?$/, 'telegram-link-start')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  if (!N8N_LINK_START_URL) {
    console.error('Missing N8N_LINK_START_URL and unable to derive from N8N_WEBHOOK_URL')
    return res.status(500).json({ message: 'Server misconfiguration' })
  }

  const authHeader = req.headers.authorization || ''
  try {
    const forwardRes = await fetch(N8N_LINK_START_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify(req.body || {})
    })

    const responseText = await forwardRes.text()

    if (!forwardRes.ok) {
      console.error('Failed forwarding telegram-link-start to n8n', forwardRes.status, responseText)
      return res.status(forwardRes.status).send(responseText || JSON.stringify({ message: 'Upstream error' }))
    }

    try {
      return res.status(200).json(responseText ? JSON.parse(responseText) : {})
    } catch {
      return res.status(200).send(responseText)
    }
  } catch (error) {
    console.error('Error forwarding telegram-link-start to n8n', error)
    return res.status(502).json({ message: 'Failed to reach automation service' })
  }
}
