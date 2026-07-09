const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  process.env.VITE_SUPABASE_URL || 'https://iesmzunoepfwkxilvxdv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function main() {
  const userId = 'dcbbe3e4-b3d9-4359-9cea-97446e86351b'

  const { data: conn, error } = await sb
    .from('whatsapp_connections')
    .select('waba_id, phone_number_id, display_phone_number, active')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (error || !conn) {
    console.error('No connection found:', error?.message)
    process.exit(1)
  }

  console.log('Connection:', {
    waba_id: conn.waba_id,
    phone_number_id: conn.phone_number_id,
    display_phone_number: conn.display_phone_number,
    active: conn.active
  })

  // Get access token separately
  const { data: tokenRow } = await sb
    .from('whatsapp_connections')
    .select('access_token')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (!tokenRow?.access_token) {
    console.error('No access token found')
    process.exit(1)
  }

  const token = tokenRow.access_token
  console.log('Token available: yes, length:', token.length)

  // Query Meta templates API
  console.log('\n--- Querying Meta Templates API ---')
  console.log(`GET https://graph.facebook.com/v25.0/${conn.waba_id}/message_templates?name=appointment_confirmation`)

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${conn.waba_id}/message_templates?name=appointment_confirmation&fields=name,language,status,category,components`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const json = await res.json()

  if (json.error) {
    console.error('Meta API error:', json.error)
  } else {
    console.log('\nTemplates found:', json.data?.length || 0)
    for (const t of (json.data || [])) {
      console.log(`\n  Name: ${t.name}`)
      console.log(`  Language: ${t.language}`)
      console.log(`  Status: ${t.status}`)
      console.log(`  Category: ${t.category}`)
      console.log(`  Components:`, JSON.stringify(t.components, null, 2))
    }
  }

  // Also search for any template with "appointment" in the name
  console.log('\n--- All templates with "appointment" ---')
  const res2 = await fetch(
    `https://graph.facebook.com/v25.0/${conn.waba_id}/message_templates?fields=name,language,status&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const json2 = await res2.json()

  if (json2.data) {
    const matching = json2.data.filter(t => t.name.includes('appointment'))
    console.log('Matching templates:', matching.length)
    for (const t of matching) {
      console.log(`  - ${t.name} | lang: ${t.language} | status: ${t.status}`)
    }

    console.log('\n--- ALL templates (names only) ---')
    for (const t of json2.data) {
      console.log(`  - ${t.name} | lang: ${t.language} | status: ${t.status}`)
    }
  }
}

main().catch(e => console.error(e))
