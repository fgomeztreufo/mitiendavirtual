const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  process.env.VITE_SUPABASE_URL || 'https://iesmzunoepfwkxilvxdv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const TEMPLATE_DEF = {
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

async function main() {
  const userId = process.argv[2] || 'dcbbe3e4-b3d9-4359-9cea-97446e86351b'

  const { data: conn, error } = await sb
    .from('whatsapp_connections')
    .select('waba_id, access_token, display_phone_number')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (error || !conn) {
    console.error('No connection found:', error?.message)
    process.exit(1)
  }

  console.log(`WABA: ${conn.waba_id} | Phone: ${conn.display_phone_number}`)
  console.log(`Creating template "${TEMPLATE_DEF.name}" (lang: ${TEMPLATE_DEF.language})...\n`)

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${conn.waba_id}/message_templates`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEMPLATE_DEF)
    }
  )

  const json = await res.json()

  if (res.ok) {
    console.log('Template created successfully!')
    console.log('ID:', json.id)
    console.log('Status:', json.status)
    console.log('\nMeta usually approves UTILITY templates within minutes.')
  } else {
    console.error('Error creating template:')
    console.error(JSON.stringify(json, null, 2))

    if (json.error?.error_user_msg) {
      console.error('\nUser message:', json.error.error_user_msg)
    }
  }
}

main().catch(e => console.error(e))
