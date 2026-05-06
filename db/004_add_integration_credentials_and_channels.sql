-- 004_add_integration_credentials_and_channels.sql
-- Adds a JSONB `channels` column to `instances` and a secure
-- `integration_credentials` table for storing encrypted provider secrets.
-- Includes RLS policies and two RPC functions: `store_integration_credential`
-- (encrypts & upserts) and `upsert_instance_channel` (merges channels JSON).

BEGIN;

-- required for gen_random_uuid() and pgp_sym_encrypt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Add channels column to instances (non-destructive)
ALTER TABLE instances
  ADD COLUMN IF NOT EXISTS channels jsonb DEFAULT '{}'::jsonb;

-- 2) Create integration_credentials table
CREATE TABLE IF NOT EXISTS integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instance_id uuid,
  provider text NOT NULL,
  credential_type text NOT NULL,
  credential_value bytea NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Foreign keys (non-destructive; will fail if referenced tables/cols missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'instances')
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'fk_integration_credentials_instance'
     ) THEN
    ALTER TABLE integration_credentials
      ADD CONSTRAINT fk_integration_credentials_instance FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- ignore if instances doesn't exist in some environments
  RAISE NOTICE 'Table instances not found; skipping FK creation';
END$$;

-- Reference to Supabase auth users table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'users' AND pg_catalog.pg_table_is_visible(pg_class.oid)) THEN
    -- if there is a public.users table, skip: we expect auth.users in Supabase
    NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END$$;

-- Unique constraint to prevent duplicate credential rows for same (user,instance,provider,type)
CREATE UNIQUE INDEX IF NOT EXISTS integration_credentials_uc ON integration_credentials(user_id, instance_id, provider, credential_type);

-- 3) Row-Level Security (RLS)
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

-- Allow selects/inserts/updates/deletes by owner or by service_role
DO $$ BEGIN
  CREATE POLICY "integration_credentials_select_owner_or_service_role"
    ON integration_credentials FOR SELECT
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "integration_credentials_insert_owner_or_service_role"
    ON integration_credentials FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "integration_credentials_update_owner_or_service_role"
    ON integration_credentials FOR UPDATE
    USING (auth.role() = 'service_role' OR auth.uid() = user_id)
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "integration_credentials_delete_owner_or_service_role"
    ON integration_credentials FOR DELETE
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) RPC: store_integration_credential
-- This RPC encrypts the credential_value using pgp_sym_encrypt and upserts.
-- Caller must be trusted (service_role) or the same user. The encryption key
-- is passed as `p_encrypt_key` (store this key securely in n8n or your server
-- environment; do NOT pass it from untrusted clients).
CREATE OR REPLACE FUNCTION public.store_integration_credential(
  p_user_id uuid,
  p_instance_id uuid,
  p_provider text,
  p_credential_type text,
  p_credential_value_text text,
  p_encrypt_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO integration_credentials (user_id, instance_id, provider, credential_type, credential_value, metadata, created_at, updated_at)
  VALUES (
    p_user_id,
    p_instance_id,
    p_provider,
    p_credential_type,
    pgp_sym_encrypt(p_credential_value_text, p_encrypt_key),
    '{}'::jsonb,
    now(),
    now()
  )
  ON CONFLICT (user_id, instance_id, provider, credential_type)
  DO UPDATE SET
    credential_value = pgp_sym_encrypt(p_credential_value_text, p_encrypt_key),
    updated_at = now();
END;
$$;

-- 5) RPC: upsert_instance_channel
-- Merge/overwrite the provider key inside instances.channels JSONB.
CREATE OR REPLACE FUNCTION public.upsert_instance_channel(
  p_instance_id uuid,
  p_provider text,
  p_provider_metadata json
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE instances
  SET channels = COALESCE(channels, '{}'::jsonb) || jsonb_build_object(p_provider, p_provider_metadata::jsonb)
  WHERE id = p_instance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Instance % not found', p_instance_id;
  END IF;
END;
$$;

COMMIT;

-- Notes:
-- - Use `public.store_integration_credential(user_id, instance_id, provider, type, token, encryptKey)`
--   from a trusted runner (n8n with SUPABASE_SERVICE_ROLE_KEY) and keep `encryptKey`
--   in n8n credentials (not in the browser).
-- - The `integration_credentials` table stores encrypted bytes (`bytea`). Decryption
--   can be done with `pgp_sym_decrypt(credential_value, key)` inside a SECURITY DEFINER
--   RPC if needed, but prefer performing actions server-side and never returning
--   plaintext tokens to clients.
