import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

let firebaseApp;

function getFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  return firebaseApp;
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: shared secret from n8n
  const secret = req.headers['x-push-secret'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!secret || secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { user_id, title, body, data } = req.body || {};
  if (!user_id || !title) {
    return res.status(400).json({ error: 'user_id and title are required' });
  }

  try {
    // Get active push configs for this user
    const { data: configs, error } = await supabase
      .from('user_notification_configs')
      .select('config')
      .eq('user_id', user_id)
      .eq('channel_type', 'push')
      .eq('is_active', true);

    if (error) throw error;

    const tokens = (configs || [])
      .map(c => c.config?.fcm_token)
      .filter(Boolean);

    if (tokens.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No active push subscriptions' });
    }

    const app = getFirebaseAdmin();
    const messaging = app.messaging();

    const message = {
      notification: { title, body: body || '' },
      data: data || {},
      webpush: {
        notification: {
          icon: '/images/icon-192.png',
          badge: '/images/icon-72.png',
          tag: 'mtv-alert',
        },
      },
    };

    let sent = 0;
    let failed = 0;

    for (const token of tokens) {
      try {
        await messaging.send({ ...message, token });
        sent++;
      } catch (err) {
        failed++;
        // If token is invalid, clean it up
        if (err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token') {
          await supabase
            .from('user_notification_configs')
            .update({ is_active: false, config: {} })
            .eq('user_id', user_id)
            .eq('channel_type', 'push');
        }
      }
    }

    return res.status(200).json({ sent, failed });
  } catch (err) {
    console.error('Push notification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
