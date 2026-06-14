// Direct Meta Graph API lookup — no n8n dependency.
// GET /api/whatsapp-meta-numbers
// Header: Authorization: Bearer <META_ACCESS_TOKEN>
// Returns: array of { phone_number_id, waba_id, display_phone_number, verified_name, quality_rating }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' })

  const auth = req.headers.authorization || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ message: 'Missing Authorization: Bearer <META_ACCESS_TOKEN>' })

  try {
    // Step 1: Get all WABAs the token has access to
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
      // Fallback: try via /me/businesses
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

    // Step 2: For each WABA, get phone numbers
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
    return res.status(500).json({ message: 'Internal error', error: err.message })
  }
}
