-- 016_fix_integration_credentials_null_instance.sql
-- Fixes the unique index on integration_credentials to handle NULL instance_id.
-- PostgreSQL treats NULL != NULL in unique indexes, so the ON CONFLICT
-- in store_integration_credential never fires when instance_id IS NULL,
-- creating duplicate rows instead of upserting.

BEGIN;

-- 1) Remove duplicate rows (keep only the most recent per user/provider/type where instance_id IS NULL)
DELETE FROM integration_credentials a
USING integration_credentials b
WHERE a.user_id = b.user_id
  AND a.instance_id IS NULL AND b.instance_id IS NULL
  AND a.provider = b.provider
  AND a.credential_type = b.credential_type
  AND a.updated_at < b.updated_at;

-- 2) Drop old index that doesn't handle NULLs
DROP INDEX IF EXISTS integration_credentials_uc;

-- 3) Create two partial indexes: one for NULL instance_id, one for non-NULL
CREATE UNIQUE INDEX IF NOT EXISTS integration_credentials_uc_with_instance
  ON integration_credentials(user_id, instance_id, provider, credential_type)
  WHERE instance_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS integration_credentials_uc_null_instance
  ON integration_credentials(user_id, provider, credential_type)
  WHERE instance_id IS NULL;

-- 4) Update the store RPC to handle NULL instance_id conflict correctly
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
  IF p_instance_id IS NULL THEN
    -- Use the partial index for NULL instance_id
    INSERT INTO integration_credentials (user_id, instance_id, provider, credential_type, credential_value, metadata, created_at, updated_at)
    VALUES (
      p_user_id, NULL, p_provider, p_credential_type,
      pgp_sym_encrypt(p_credential_value_text, p_encrypt_key),
      '{}'::jsonb, now(), now()
    )
    ON CONFLICT (user_id, provider, credential_type) WHERE instance_id IS NULL
    DO UPDATE SET
      credential_value = pgp_sym_encrypt(p_credential_value_text, p_encrypt_key),
      updated_at = now();
  ELSE
    INSERT INTO integration_credentials (user_id, instance_id, provider, credential_type, credential_value, metadata, created_at, updated_at)
    VALUES (
      p_user_id, p_instance_id, p_provider, p_credential_type,
      pgp_sym_encrypt(p_credential_value_text, p_encrypt_key),
      '{}'::jsonb, now(), now()
    )
    ON CONFLICT (user_id, instance_id, provider, credential_type) WHERE instance_id IS NOT NULL
    DO UPDATE SET
      credential_value = pgp_sym_encrypt(p_credential_value_text, p_encrypt_key),
      updated_at = now();
  END IF;
END;
$$;

-- 5) Update the get_decrypted_credential RPC to handle NULL instance_id
CREATE OR REPLACE FUNCTION public.get_decrypted_credential(
  p_user_id uuid,
  p_instance_id uuid,
  p_provider text,
  p_credential_type text,
  p_encrypt_key text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_encrypted bytea;
BEGIN
  IF p_instance_id IS NULL THEN
    SELECT credential_value INTO v_encrypted
    FROM integration_credentials
    WHERE user_id = p_user_id
      AND instance_id IS NULL
      AND provider = p_provider
      AND credential_type = p_credential_type
    ORDER BY updated_at DESC
    LIMIT 1;
  ELSE
    SELECT credential_value INTO v_encrypted
    FROM integration_credentials
    WHERE user_id = p_user_id
      AND instance_id = p_instance_id
      AND provider = p_provider
      AND credential_type = p_credential_type
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_decrypt(v_encrypted, p_encrypt_key);
END;
$$;

COMMIT;
