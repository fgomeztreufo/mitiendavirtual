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
  },
  {
    name: 'new_lead_notification',
    language: 'es',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Nuevo lead desde {{1}}: {{2}} ({{3}}) te ha contactado. Revisa tu panel para responder.',
        example: {
          body_text: [['WhatsApp', 'Carlos Pérez', '+56 9 1234 5678']]
        }
      }
    ]
  },
  {
    name: 'payment_received',
    language: 'es',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}}, tu pago de {{2}} por {{3}} ha sido recibido exitosamente. Gracias por tu compra.',
        example: {
          body_text: [['Felipe', '$14.990', 'Plan Básico']]
        }
      }
    ]
  },
  {
    name: 'order_update',
    language: 'es',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}}, tu pedido de {{2}} ha sido {{3}}. Gracias por tu preferencia.',
        example: {
          body_text: [['Felipe', 'Zapatillas Nike', 'enviado']]
        }
      }
    ]
  },
  {
    name: 'credits_depleted',
    language: 'es',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}}, tu bot se quedó sin créditos IA este mes. Un cliente intentó contactarte pero no pudimos responder. Recarga en mitiendavirtual.cl para no perder más ventas.',
        example: {
          body_text: [['Felipe']]
        }
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Recargar ahora', url: 'https://mitiendavirtual.cl' }
        ]
      }
    ]
  },
  {
    name: 'credits_low',
    language: 'es',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}}, te quedan solo {{2}} créditos IA este mes. Recarga para no perder ventas cuando se agoten.',
        example: {
          body_text: [['Felipe', '5']]
        }
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Ver planes', url: 'https://mitiendavirtual.cl' }
        ]
      }
    ]
  },
  {
    name: 'plan_expired',
    language: 'es',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}}, tu plan {{2}} ha expirado. Tu bot está pausado y no puede responder a tus clientes. Renueva en mitiendavirtual.cl para reactivarlo.',
        example: {
          body_text: [['Felipe', 'Pro']]
        }
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Renovar plan', url: 'https://mitiendavirtual.cl' }
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
