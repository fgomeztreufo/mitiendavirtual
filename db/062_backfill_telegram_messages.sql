-- 062_backfill_telegram_messages.sql
-- Backfill telegram_messages desde usage_logs existentes (one-time).

-- Mensajes entrantes
INSERT INTO telegram_messages (user_id, chat_id, contact_name, direction, body, sender_type, tg_message_id, created_at)
SELECT
  ul.user_id,
  ul.sender_id AS chat_id,
  COALESCE(
    CASE WHEN ul.details IS NOT NULL AND ul.details::text LIKE '{%' THEN (ul.details::jsonb ->> 'nombre') END,
    tlt.telegram_username
  ) AS contact_name,
  'inbound' AS direction,
  COALESCE(
    CASE WHEN ul.details IS NOT NULL AND ul.details::text LIKE '{%' THEN (ul.details::jsonb ->> 'mensaje') END,
    ul.details::text
  ) AS body,
  'ai' AS sender_type,
  ul.sender_id || '_' || ul.message_id AS tg_message_id,
  ul.created_at
FROM usage_logs ul
LEFT JOIN telegram_link_tokens tlt ON tlt.chat_id::text = ul.sender_id::text AND tlt.used = true
WHERE ul.sistema = 'Telegram'
  AND ul.type = 'dm'
  AND ul.sender_id IS NOT NULL
  AND ul.user_id IS NOT NULL
ON CONFLICT (tg_message_id) WHERE tg_message_id IS NOT NULL DO NOTHING;

-- Respuestas IA
INSERT INTO telegram_messages (user_id, chat_id, contact_name, direction, body, sender_type, tg_message_id, created_at)
SELECT
  ul.user_id,
  ul.sender_id AS chat_id,
  COALESCE(
    CASE WHEN ul.details IS NOT NULL AND ul.details::text LIKE '{%' THEN (ul.details::jsonb ->> 'nombre') END,
    tlt.telegram_username
  ) AS contact_name,
  'outbound' AS direction,
  ul.response_ia::text AS body,
  'ai' AS sender_type,
  ul.sender_id || '_' || ul.message_id || '_resp' AS tg_message_id,
  ul.created_at + interval '1 second'
FROM usage_logs ul
LEFT JOIN telegram_link_tokens tlt ON tlt.chat_id::text = ul.sender_id::text AND tlt.used = true
WHERE ul.sistema = 'Telegram'
  AND ul.type = 'dm'
  AND ul.sender_id IS NOT NULL
  AND ul.user_id IS NOT NULL
  AND ul.response_ia IS NOT NULL
  AND ul.response_ia::text <> ''
ON CONFLICT (tg_message_id) WHERE tg_message_id IS NOT NULL DO NOTHING;
