-- 005_add_get_decrypted_credential_rpc.sql
-- RPC to decrypt a stored integration credential for server-side use only.
-- Must be called with service_role key; RLS ensures only owner or service_role access.

BEGIN;

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
  SELECT credential_value INTO v_encrypted
  FROM integration_credentials
  WHERE user_id = p_user_id
    AND instance_id = p_instance_id
    AND provider = p_provider
    AND credential_type = p_credential_type
  LIMIT 1;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_decrypt(v_encrypted, p_encrypt_key);
END;
$$;

-- Only service_role should call this (it requires the encryption key)
REVOKE ALL ON FUNCTION public.get_decrypted_credential(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_decrypted_credential(uuid, uuid, text, text, text) TO service_role;

COMMIT;
