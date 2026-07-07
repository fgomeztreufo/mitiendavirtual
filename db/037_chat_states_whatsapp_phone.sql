-- Add whatsapp_phone column to chat_states for WhatsApp handoff tracking
ALTER TABLE public.chat_states
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

CREATE INDEX IF NOT EXISTS idx_chat_states_whatsapp_phone
  ON public.chat_states (whatsapp_phone)
  WHERE whatsapp_phone IS NOT NULL;
