import { corsHeaders, verifyUser, getValidAccessToken } from './_lib/google-tokens.js'

export default async function handler(req, res) {
  corsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })

  const user = await verifyUser(req)
  if (!user) return res.status(401).json({ message: 'No autorizado' })

  try {
    const accessToken = await getValidAccessToken(user.id)

    const gcalRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!gcalRes.ok) {
      const err = await gcalRes.text()
      console.error('Google Calendar list error:', err)
      return res.status(502).json({ message: 'Error al consultar Google Calendar' })
    }

    const data = await gcalRes.json()

    const calendars = (data.items || [])
      .filter(c => c.accessRole === 'owner' || c.accessRole === 'writer')
      .map(c => ({
        id: c.id,
        summary: c.summary || c.id,
        primary: c.primary || false,
        backgroundColor: c.backgroundColor || null,
      }))

    return res.json({ calendars })
  } catch (err) {
    console.error('Google calendar list error:', err)
    if (err.message?.includes('refresh')) {
      return res.status(401).json({ message: 'Reconexión requerida', reconnect: true })
    }
    return res.status(500).json({ message: 'Error interno' })
  }
}
