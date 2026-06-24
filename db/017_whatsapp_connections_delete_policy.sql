-- 017_whatsapp_connections_delete_policy.sql
-- Adds DELETE RLS policies to whatsapp_connections so users (and service_role)
-- can remove their own connections when unlinking WhatsApp.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'whatsapp_connections' AND policyname = 'wac_delete_owner'
  ) THEN
    CREATE POLICY wac_delete_owner
      ON whatsapp_connections FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'whatsapp_connections' AND policyname = 'wac_delete_service_role'
  ) THEN
    CREATE POLICY wac_delete_service_role
      ON whatsapp_connections FOR DELETE
      USING (auth.role() = 'service_role');
  END IF;
END $$;
