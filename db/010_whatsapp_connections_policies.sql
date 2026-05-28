-- 010_whatsapp_connections_policies.sql
-- Create/update RLS policies for whatsapp_connections so the service_role
-- (used by n8n) or the owner (auth.uid()) can SELECT/INSERT/UPDATE.
-- NOTE: some Postgres versions don't support `CREATE POLICY IF NOT EXISTS`,
-- so we DROP IF EXISTS then CREATE the policy.

BEGIN;

-- Ensure RLS enabled (idempotent)
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- SELECT
DROP POLICY IF EXISTS wac_select_service_or_owner ON whatsapp_connections;
CREATE POLICY wac_select_service_or_owner
  ON whatsapp_connections FOR SELECT
  USING ( auth.role() = 'service_role' OR auth.uid() = user_id );

-- INSERT
DROP POLICY IF EXISTS wac_insert_service_or_owner ON whatsapp_connections;
CREATE POLICY wac_insert_service_or_owner
  ON whatsapp_connections FOR INSERT
  WITH CHECK ( auth.role() = 'service_role' OR auth.uid() = user_id );

-- UPDATE
DROP POLICY IF EXISTS wac_update_service_or_owner ON whatsapp_connections;
CREATE POLICY wac_update_service_or_owner
  ON whatsapp_connections FOR UPDATE
  USING ( auth.role() = 'service_role' OR auth.uid() = user_id )
  WITH CHECK ( auth.role() = 'service_role' OR auth.uid() = user_id );

COMMIT;
