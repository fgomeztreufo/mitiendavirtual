-- Migration: update plans with new pricing, message limits, and channel features
-- Context:
--   - Telegram now available from Basic plan (messages count toward plan pool)
--   - WhatsApp added to Pro plan (justifies price increase to 44,990)
--   - Google Calendar scheduling added to Full plan (price increase to 79,990)
--   - Pro plan moves to unlimited messages (WhatsApp has higher volume)

BEGIN;

-- 1) Add channels JSONB column to store which channels each plan unlocks
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS channels jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Update pricing, limits, descriptions and channels per plan
UPDATE public.plans SET
  monthly_price_clp = 0,
  products_limit     = 10,
  messages_limit     = 50,
  description        = 'Para empezar a explorar. Incluye catálogo básico y bot IA en Instagram.',
  channels           = '["instagram"]'::jsonb
WHERE code = 'free';

UPDATE public.plans SET
  monthly_price_clp = 14990,
  products_limit     = 50,
  messages_limit     = 500,
  description        = 'Ideal para emprendedores. Bot IA en Instagram y Telegram. Los mensajes comparten el pool del plan.',
  channels           = '["instagram","telegram"]'::jsonb
WHERE code = 'basic';

UPDATE public.plans SET
  monthly_price_clp = 44990,
  products_limit     = 500,
  messages_limit     = NULL,   -- ilimitados
  description        = 'Para negocios en crecimiento. Suma WhatsApp — el canal que más vende en Chile. Mensajes ilimitados.',
  channels           = '["instagram","telegram","whatsapp"]'::jsonb
WHERE code = 'pro';

UPDATE public.plans SET
  monthly_price_clp = 79990,
  products_limit     = 2000,
  messages_limit     = NULL,   -- ilimitados
  description        = 'Domina tu mercado. Incluye agendamiento automático con Google Calendar y todos los canales.',
  channels           = '["instagram","telegram","whatsapp","google_calendar"]'::jsonb
WHERE code = 'full';

COMMIT;

-- NOTE:
-- Run from Supabase SQL Editor or a secure psql connection.
-- The `channels` column is informational for the frontend display.
-- Actual channel access enforcement happens in the n8n workflows + backend logic.
-- After running, verify with: SELECT code, monthly_price_clp, messages_limit, channels FROM plans ORDER BY monthly_price_clp;
