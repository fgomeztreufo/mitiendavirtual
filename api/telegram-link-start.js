import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const N8N_LINK_START_URL = process.env.N8N_LINK_START_URL || deriveLinkStartUrl(process.env.N8N_WEBHOOK_URL || '')

function deriveLinkStartUrl(n8nWebhookUrl) {
  if (!n8nWebhookUrl) return ''
  return n8nWebhookUrl.replace(/telegram-central\/?$/, 'telegram-link-start')
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let supabaseAdmin = null
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || (process.env.VITE_TELEGRAM_BOT_USERNAME) || 'mi_tienda_virtual_bot'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  // Safely parse body (some server runtimes provide parsed body, others stream)
  let body = req.body
  if (!body) {
    try {
      body = await new Promise((resolve, reject) => {
        let data = ''
        req.on('data', chunk => { data += chunk })
        req.on('end', () => {
          try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) }
        })
        req.on('error', reject)
      })
    } catch {
      body = {}
    }
  }

  const authHeader = req.headers.authorization || ''
  const userIdFromBody = body?.user_id || body?.userId || body?.user || null
  let userId = userIdFromBody

  // Debug logging: surface incoming values for troubleshooting
  try {
    console.log('[telegram-link-start] incoming', {
      userIdFromBody,
      authHeader: authHeader ? '[REDACTED]' : '',
      bodySummary: typeof body === 'object' ? Object.keys(body).slice(0,10) : String(body)
    })
  } catch (e) {
    console.warn('[telegram-link-start] logging failed', e)
  }
  // If user_id not provided, try to resolve it from the bearer token via Supabase auth endpoint
  if (!userId && authHeader && SUPABASE_URL) {
    try {
      const uRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
        method: 'GET',
        headers: { Authorization: authHeader }
      })
      if (uRes.ok) {
        const uJson = await uRes.json().catch(() => ({}))
        userId = uJson?.id || (uJson?.user && uJson.user.id) || null
      }
    } catch (err) {
      // ignore — we'll fallback to forwarding to n8n
      console.warn('Could not resolve user from token locally', err)
    }
  }

  // If we have a user id, generate a one-time token and persist it.
  // Behaviour: if a token row already exists for this user, update that row (no duplicates).
  if (userId) {
    const token = randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + (body?.expires_in ? Number(body.expires_in) * 1000 : 10 * 60 * 1000))

    try {
      let persisted = false
      let row = null

      // 1) Try to update existing rows for this user via supabaseAdmin (if available)
      if (supabaseAdmin) {
        try {
          const { data: updatedRows, error: updateError } = await supabaseAdmin
            .from('telegram_link_tokens')
            .update({ token, expires_at: expiresAt.toISOString(), used: false })
            .eq('user_id', userId)
            .select()

          if (updateError) {
            console.warn('[telegram-link-start] supabaseAdmin update error', updateError)
          } else if (updatedRows && updatedRows.length > 0) {
            row = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows
            persisted = true
            console.log('[telegram-link-start] updated existing token via supabaseAdmin', { id: row?.id })
          }
        } catch (err) {
          console.warn('[telegram-link-start] supabaseAdmin update threw', err)
        }
      }

      // 2) If no existing row updated, try REST PATCH (service role) to update any existing row
      if (!persisted && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const restUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens?user_id=eq.${userId}`
          const resp = await fetch(restUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              Prefer: 'return=representation'
            },
            body: JSON.stringify({ token, expires_at: expiresAt.toISOString(), used: false })
          })

          const json = await resp.json().catch(() => null)
          if (resp.ok && json && (Array.isArray(json) ? json.length > 0 : true)) {
            row = Array.isArray(json) ? json[0] : json
            persisted = true
            console.log('[telegram-link-start] updated existing token via REST', { id: row?.id })
          }
        } catch (err) {
          console.warn('[telegram-link-start] REST patch threw', err)
        }
      }

      // 3) If still not persisted, insert a fresh row (using supabaseAdmin or REST fallback)
      if (!persisted) {
        if (supabaseAdmin) {
          try {
            const { data: insertedData, error: insertError } = await supabaseAdmin
              .from('telegram_link_tokens')
              .insert({ user_id: userId, token, expires_at: expiresAt.toISOString() })
              .select()
              .single()

            if (insertError) {
              console.warn('[telegram-link-start] supabaseAdmin insert error', insertError)
            } else {
              row = insertedData
              persisted = true
              console.log('[telegram-link-start] inserted via supabaseAdmin', { id: row?.id })
            }
          } catch (err) {
            console.warn('[telegram-link-start] supabaseAdmin insert threw', err)
          }
        }

        if (!persisted && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          try {
            const restUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens`
            const resp = await fetch(restUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                Prefer: 'return=representation'
              },
              body: JSON.stringify({ user_id: userId, token, expires_at: expiresAt.toISOString() })
            })

            const json = await resp.json().catch(() => null)
            if (resp.ok) {
              row = Array.isArray(json) ? json[0] : json
              persisted = true
              console.log('[telegram-link-start] inserted via REST', { id: row?.id })
            } else {
              console.error('[telegram-link-start] REST insert failed', resp.status, json)
            }
          } catch (err) {
            console.error('[telegram-link-start] REST insert threw', err)
          }
        }
      }

      const url = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`

      // fire-and-forget notify to n8n (keeps backward compatibility without blocking)
      if (N8N_LINK_START_URL) {
        try {
          void fetch(N8N_LINK_START_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
            body: JSON.stringify({ ...(body || {}), token })
          })
        } catch (err) {
          console.warn('Failed forwarding new token to n8n (ignored)', err)
        }
      }

      if (!persisted) {
        console.warn('[telegram-link-start] token generated but not persisted')
        return res.status(200).json({ url, token, persisted: false })
      }

      // Cleanup duplicates: delete any other rows for this user, keep the current one
      try {
        if (row?.id) {
          if (supabaseAdmin) {
            try {
              await supabaseAdmin
                .from('telegram_link_tokens')
                .delete()
                .neq('id', row.id)
                .eq('user_id', userId)
            } catch (err) {
              console.warn('[telegram-link-start] cleanup delete threw', err)
            }
          } else if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
            try {
              const delUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/telegram_link_tokens?user_id=eq.${userId}&id=neq.${row.id}`
              await fetch(delUrl, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
              })
            } catch (err) {
              console.warn('[telegram-link-start] REST cleanup delete threw', err)
            }
          }
        }
      } catch (err) {
        console.warn('[telegram-link-start] cleanup failed', err)
      }

      return res.status(200).json({ url, token, persisted: true })
    } catch (err) {
      console.error('Error creating/updating telegram link token', err)
      // fall through to forwarding
    }
  }

  // Fallback: forward request to n8n as before
  if (!N8N_LINK_START_URL) {
    console.error('Missing N8N_LINK_START_URL and unable to derive from N8N_WEBHOOK_URL')
    return res.status(500).json({ message: 'Server misconfiguration' })
  }

  try {
    const forwardRes = await fetch(N8N_LINK_START_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify(body || {})
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
