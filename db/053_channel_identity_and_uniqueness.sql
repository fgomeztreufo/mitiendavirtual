-- 053: Channel identity fields + uniqueness constraints
-- Agrega campos de identidad de negocio por canal y constraints para prevenir abuso

-- ============================================================
-- 1. INSTAGRAM — identity fields + unique provider_id
-- ============================================================

ALTER TABLE instances ADD COLUMN IF NOT EXISTS ig_username text;
ALTER TABLE instances ADD COLUMN IF NOT EXISTS ig_page_name text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_instances_provider_id_unique
  ON instances (provider_id) WHERE provider_id IS NOT NULL;

-- ============================================================
-- 2. TELEGRAM — unique chat_id for active links
-- ============================================================

-- Limpiar duplicados antes de crear el índice:
-- Si hay múltiples tokens used=true con el mismo chat_id, conservar solo el más reciente
WITH dupes AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY chat_id ORDER BY created_at DESC
  ) AS rn
  FROM telegram_link_tokens
  WHERE chat_id IS NOT NULL AND used = true
)
UPDATE telegram_link_tokens
SET used = false
WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_active_chat_unique
  ON telegram_link_tokens (chat_id) WHERE chat_id IS NOT NULL AND used = true;

-- ============================================================
-- 3. WHATSAPP — identity fields (phone_number_id UNIQUE ya existe)
-- ============================================================

ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS verified_name text;
ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS waba_name text;
