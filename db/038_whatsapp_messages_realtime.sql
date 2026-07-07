-- Enable Realtime for whatsapp_messages so the Bandeja subscription works
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- Replica identity FULL is required for Realtime with RLS + row-level filters
ALTER TABLE whatsapp_messages REPLICA IDENTITY FULL;
