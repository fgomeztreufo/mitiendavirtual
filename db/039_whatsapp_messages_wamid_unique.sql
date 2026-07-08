-- Clean empty wamid values before adding unique constraint
UPDATE whatsapp_messages SET wamid = NULL WHERE wamid = '';

-- Add unique constraint on wamid to prevent duplicate message logging
CREATE UNIQUE INDEX IF NOT EXISTS idx_wpp_msgs_wamid_unique
  ON whatsapp_messages (wamid)
  WHERE wamid IS NOT NULL;
