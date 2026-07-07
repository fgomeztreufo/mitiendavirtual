-- Migration: distinguish AI-sent vs human-sent outbound WhatsApp messages
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS sender_type text NOT NULL DEFAULT 'ai';

-- Values: 'ai' (bot via n8n), 'human' (sent from web inbox)
