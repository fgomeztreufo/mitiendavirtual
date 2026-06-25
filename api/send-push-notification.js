import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_lib/push-sender.js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-push-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pushSecret = req.headers['x-push-secret'];
  const bearerToken = (req.headers['authorization'] || '').replace('Bearer ', '');
  let authenticatedUserId = null;

  if (pushSecret && pushSecret === process.env.PUSH_WEBHOOK_SECRET) {
    // n8n / server-to-server auth
  } else if (bearerToken) {
    const { data: { user }, error } = await supabase.auth.getUser(bearerToken);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
    authenticatedUserId = user.id;
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { user_id, title, body, data } = req.body || {};
  const targetUserId = authenticatedUserId || user_id;

  if (!targetUserId || !title) {
    return res.status(400).json({ error: 'user_id and title are required' });
  }

  if (authenticatedUserId && user_id && authenticatedUserId !== user_id) {
    return res.status(403).json({ error: 'Cannot send push to another user' });
  }

  try {
    const result = await sendPushToUser(targetUserId, { title, body, data });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Push notification error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
