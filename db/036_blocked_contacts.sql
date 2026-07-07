-- Migration: blocked contacts list for spam prevention
CREATE TABLE IF NOT EXISTS public.blocked_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  reason text,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, contact_phone, channel)
);

CREATE INDEX IF NOT EXISTS idx_blocked_contacts_lookup
  ON public.blocked_contacts (user_id, contact_phone, channel);

-- RLS
ALTER TABLE public.blocked_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocked_contacts_select_owner ON public.blocked_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY blocked_contacts_insert_owner ON public.blocked_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY blocked_contacts_delete_owner ON public.blocked_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Service role access (for n8n to check)
CREATE POLICY blocked_contacts_select_service ON public.blocked_contacts
  FOR SELECT USING (auth.role() = 'service_role');
