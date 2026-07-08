-- Add 'system' as a valid sender_type for automated template messages
-- Existing values: 'ai' (bot via n8n), 'human' (sent from web inbox)
-- New value: 'system' (automated template messages like appointment confirmations)
COMMENT ON COLUMN public.whatsapp_messages.sender_type IS
  'ai = bot via n8n, human = sent from web inbox, system = automated template message';
