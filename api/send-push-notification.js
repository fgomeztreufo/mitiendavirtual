import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_lib/push-sender.js';

const GRAPH_API = 'https://graph.facebook.com/v25.0'
const TELEGRAM_API = 'https://api.telegram.org'

function safeEqual(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PUSH_ALLOWED_ORIGINS = ['https://mitiendavirtual.cl', 'https://www.mitiendavirtual.cl', 'http://localhost:5173'];

// --- Multi-channel notification types ---

const NOTIFICATION_TYPES = {
  credits_depleted: {
    push: {
      title: '🚨 Tu bot se quedó sin créditos',
      body: 'Un cliente intentó contactarte pero no pudimos responder. Recarga para no perder ventas.'
    },
    wpp_template: 'credits_depleted',
    telegram: '🚨 *Tu bot se quedó sin créditos IA*\n\nUn cliente intentó contactarte pero no pudimos responder. Recarga en [mitiendavirtual.cl](https://mitiendavirtual.cl) para no perder más ventas.'
  },
  credits_low: {
    push: {
      title: '⚠️ Créditos IA bajos',
      body: (p) => `Te quedan solo ${p.remaining || '?'} créditos este mes. Recarga para no perder ventas.`
    },
    wpp_template: 'credits_low',
    telegram: (p) => `⚠️ *Créditos IA bajos*\n\nTe quedan solo ${p.remaining || '?'} créditos este mes. Recarga en [mitiendavirtual.cl](https://mitiendavirtual.cl) para no perder ventas.`
  },
  plan_expired: {
    push: {
      title: '🚨 Tu plan expiró',
      body: (p) => `Tu plan ${p.plan_name || ''} ha expirado. Tu bot está pausado. Renueva para reactivar.`
    },
    wpp_template: 'plan_expired',
    telegram: (p) => `🚨 *Tu plan ${p.plan_name || ''} ha expirado*\n\nTu bot está pausado y no puede responder a tus clientes. Renueva en [mitiendavirtual.cl](https://mitiendavirtual.cl) para reactivarlo.`
  },
  new_lead: {
    push: {
      title: '🔔 Nuevo lead',
      body: (p) => `${p.lead_name || 'Alguien'} te contactó desde ${p.channel || 'tu canal'}. Revisa tu panel.`
    },
    wpp_template: 'new_lead_notification',
    telegram: (p) => `🔔 *Nuevo lead desde ${p.channel || 'tu canal'}*\n\n${p.lead_name || 'Alguien'} (${p.lead_phone || 'sin teléfono'}) te ha contactado. Revisa tu panel para responder.`
  },
  human_handoff: {
    push: {
      title: '🙋 Cliente solicita hablar con humano',
      body: (p) => `${p.lead_name || 'Un cliente'} desde ${p.channel || 'tu canal'}. Motivo: ${p.motivo || 'Solicita atención humana'}`
    },
    wpp_template: 'human_handoff',
    telegram: (p) => `🙋 *Cliente solicita humano*\n\n${p.lead_name || 'Un cliente'} desde ${p.channel || 'tu canal'}.\nMotivo: ${p.motivo || 'Solicita atención humana'}`
  }
}

function resolveText(value, params) {
  return typeof value === 'function' ? value(params) : value
}

function buildWppTemplateComponents(templateName, params) {
  switch (templateName) {
    case 'credits_depleted':
      return [{ type: 'body', parameters: [{ type: 'text', text: params.full_name || 'Usuario' }] }]
    case 'credits_low':
      return [{ type: 'body', parameters: [
        { type: 'text', text: params.full_name || 'Usuario' },
        { type: 'text', text: String(params.remaining || '0') }
      ]}]
    case 'plan_expired':
      return [{ type: 'body', parameters: [
        { type: 'text', text: params.full_name || 'Usuario' },
        { type: 'text', text: params.plan_name || 'tu plan' }
      ]}]
    case 'new_lead_notification':
      return [{ type: 'body', parameters: [
        { type: 'text', text: params.channel || 'WhatsApp' },
        { type: 'text', text: params.lead_name || 'Prospecto' },
        { type: 'text', text: params.lead_phone || 'sin teléfono' }
      ]}]
    case 'human_handoff':
      return [{ type: 'body', parameters: [
        { type: 'text', text: params.lead_name || 'Un cliente' },
        { type: 'text', text: params.channel || 'tu canal' },
        { type: 'text', text: params.motivo || 'Solicita atención humana' }
      ]}]
    default:
      return []
  }
}

async function sendWhatsAppTemplate(userId, templateName, params) {
  const wppNotifConfig = await supabase
    .from('user_notification_configs')
    .select('config')
    .eq('user_id', userId)
    .eq('channel_type', 'whatsapp')
    .eq('is_active', true)
    .single()

  const ownerPhone = wppNotifConfig.data?.config?.owner_phone
  if (!ownerPhone) return { sent: false, reason: 'no_owner_phone' }

  const { data: conn } = await supabase
    .from('whatsapp_connections')
    .select('phone_number_id, access_token, active')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1)
    .single()

  if (!conn?.phone_number_id || !conn?.access_token) {
    return { sent: false, reason: 'no_active_connection' }
  }

  const metaRes = await fetch(`${GRAPH_API}/${conn.phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${conn.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: ownerPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'es' },
        components: buildWppTemplateComponents(templateName, params)
      }
    })
  })

  const metaData = await metaRes.json().catch(() => ({}))
  return metaRes.ok
    ? { sent: true, wamid: metaData.messages?.[0]?.id }
    : { sent: false, error: metaData.error?.message || 'Meta API error' }
}

async function sendTelegram(userId, text) {
  const platformBotToken = process.env.TELEGRAM_PLATFORM_BOT_TOKEN
  if (!platformBotToken) return { sent: false, reason: 'no_bot_token' }

  const { data: tgConfig } = await supabase
    .from('user_notification_configs')
    .select('config')
    .eq('user_id', userId)
    .eq('channel_type', 'telegram')
    .eq('is_active', true)
    .single()

  const chatId = tgConfig?.config?.telegram_chat_id
  if (!chatId) return { sent: false, reason: 'no_chat_id' }

  const tgRes = await fetch(`${TELEGRAM_API}/bot${platformBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    })
  })

  const tgData = await tgRes.json().catch(() => ({}))
  return tgData.ok
    ? { sent: true, message_id: tgData.result?.message_id }
    : { sent: false, error: tgData.description || 'Telegram API error' }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (PUSH_ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-push-secret');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pushSecret = req.headers['x-push-secret'];
  const bearerToken = (req.headers['authorization'] || '').replace('Bearer ', '');
  let authenticatedUserId = null;

  if (pushSecret && safeEqual(pushSecret, process.env.PUSH_WEBHOOK_SECRET)) {
    // n8n / server-to-server auth
  } else if (bearerToken) {
    const { data: { user }, error } = await supabase.auth.getUser(bearerToken);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
    authenticatedUserId = user.id;
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { user_id, title, body, data, notification_type, params } = req.body || {};
  const targetUserId = authenticatedUserId || user_id;

  if (!targetUserId) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (authenticatedUserId && user_id && authenticatedUserId !== user_id) {
    return res.status(403).json({ error: 'Cannot send notifications to another user' });
  }

  // --- Modo multi-canal: notification_type presente ---
  if (notification_type) {
    const config = NOTIFICATION_TYPES[notification_type]
    if (!config) {
      return res.status(400).json({ error: `Unknown notification_type: ${notification_type}` })
    }

    const notifParams = params || {}
    const results = { push: null, whatsapp: null, telegram: null }

    try {
      results.push = await sendPushToUser(targetUserId, {
        title: resolveText(config.push.title, notifParams),
        body: resolveText(config.push.body, notifParams),
        data: { type: notification_type }
      })
    } catch (err) {
      console.error('notify-owner: push error', err.message)
      results.push = { error: err.message }
    }

    if (config.wpp_template) {
      try {
        results.whatsapp = await sendWhatsAppTemplate(targetUserId, config.wpp_template, notifParams)
      } catch (err) {
        console.error('notify-owner: whatsapp error', err.message)
        results.whatsapp = { error: err.message }
      }
    }

    try {
      const telegramText = resolveText(config.telegram, notifParams)
      results.telegram = await sendTelegram(targetUserId, telegramText)
    } catch (err) {
      console.error('notify-owner: telegram error', err.message)
      results.telegram = { error: err.message }
    }

    return res.status(200).json({ ok: true, notification_type, channels: results })
  }

  // --- Modo legacy: solo push (title + body) ---
  if (!title) {
    return res.status(400).json({ error: 'title is required (or use notification_type for multi-channel)' });
  }

  try {
    const result = await sendPushToUser(targetUserId, { title, body, data });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Push notification error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
