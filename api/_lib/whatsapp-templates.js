const GRAPH_API = 'https://graph.facebook.com/v25.0'

export const DEFAULT_TEMPLATES = [
  {
    name: 'appointment_confirmation',
    language: 'es',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}}, tienes una cita de {{2}} para el {{3}} a las {{4}} con {{5}}. Por favor confirma o cancela tu asistencia.',
        example: {
          body_text: [['Felipe', 'Corte de pelo', '9 de julio', '17:00', 'María López']]
        }
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Confirmar' },
          { type: 'QUICK_REPLY', text: 'Cancelar' }
        ]
      }
    ]
  }
]

export async function provisionTemplates(wabaId, accessToken) {
  const result = { created: [], skipped: [], failed: [] }

  for (const tpl of DEFAULT_TEMPLATES) {
    try {
      const res = await fetch(`${GRAPH_API}/${wabaId}/message_templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tpl)
      })

      const json = await res.json().catch(() => ({}))

      if (res.ok) {
        result.created.push({ name: tpl.name, id: json.id, status: json.status })
      } else {
        const err = json.error || {}
        if (err.code === 100 && err.error_subcode === 2388023) {
          result.skipped.push({ name: tpl.name, reason: 'already_exists' })
        } else {
          console.error(`Template "${tpl.name}" creation failed:`, err.message || json)
          result.failed.push({ name: tpl.name, error: err.message || 'Unknown error' })
        }
      }
    } catch (e) {
      console.error(`Template "${tpl.name}" network error:`, e.message)
      result.failed.push({ name: tpl.name, error: e.message })
    }
  }

  return result
}
