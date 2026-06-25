import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createClient } from '@supabase/supabase-js';

function getFirebaseMessaging() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getMessaging();
}

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function sendPushToUser(userId, { title, body, data }) {
  const { data: configs, error } = await supabase
    .from('user_notification_configs')
    .select('config')
    .eq('user_id', userId)
    .eq('channel_type', 'push')
    .eq('is_active', true);

  if (error) {
    console.error('Push: Supabase error:', error);
    return { sent: 0, failed: 0, error: error.message };
  }

  const tokens = [];
  for (const c of (configs || [])) {
    if (c.config?.devices && Array.isArray(c.config.devices)) {
      for (const d of c.config.devices) {
        if (d.fcm_token) tokens.push(d.fcm_token);
      }
    } else if (c.config?.fcm_token) {
      tokens.push(c.config.fcm_token);
    }
  }

  const uniqueTokens = [...new Set(tokens)];
  if (uniqueTokens.length === 0) {
    return { sent: 0, failed: 0, message: 'No active push subscriptions' };
  }

  const messaging = getFirebaseMessaging();
  let sent = 0;
  let failed = 0;
  const errors = [];
  const invalidTokens = [];

  for (const token of uniqueTokens) {
    try {
      await messaging.send({
        token,
        notification: { title, body: body || '' },
        data: data || {},
        webpush: {
          notification: {
            icon: '/images/icon-192.png',
            badge: '/images/icon-72.png',
            tag: 'mtv-alert',
          },
        },
      });
      sent++;
    } catch (err) {
      failed++;
      errors.push({ token: token.slice(0, 10) + '...', error: err.code || err.message });
      if (err.code === 'messaging/registration-token-not-registered' ||
          err.code === 'messaging/invalid-registration-token') {
        invalidTokens.push(token);
      }
    }
  }

  if (invalidTokens.length > 0) {
    for (const c of (configs || [])) {
      if (c.config?.devices && Array.isArray(c.config.devices)) {
        const cleaned = c.config.devices.filter(d => !invalidTokens.includes(d.fcm_token));
        await supabase
          .from('user_notification_configs')
          .update({
            config: cleaned.length > 0
              ? { devices: cleaned, fcm_token: cleaned[0].fcm_token }
              : {},
            is_active: cleaned.length > 0,
          })
          .eq('user_id', userId)
          .eq('channel_type', 'push');
      }
    }
  }

  return { sent, failed, total_devices: uniqueTokens.length, errors: errors.length ? errors : undefined };
}
