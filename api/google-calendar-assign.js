import { corsHeaders, verifyUser, supabaseRest } from './_lib/google-tokens.js'

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
  corsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const user = await verifyUser(req)
  if (!user) return res.status(401).json({ message: 'No autorizado' })

  const body = await parseBody(req)
  const { staff_id, calendar_id } = body

  if (!staff_id) return res.status(400).json({ message: 'staff_id requerido' })

  const staff = await supabaseRest('GET', `staff_members?id=eq.${staff_id}&user_id=eq.${user.id}&select=id`)
  if (!staff || !staff.length) {
    return res.status(403).json({ message: 'Profesional no encontrado' })
  }

  await supabaseRest('PATCH', `staff_members?id=eq.${staff_id}`, {
    google_calendar_id: calendar_id || null,
  })

  return res.json({ ok: true })
}
