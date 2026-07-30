-- Habilitar Realtime en tablas que el dashboard necesita escuchar
-- para que los robots cambien de estado en vivo.

-- profiles: detectar cambios en messages_used, messages_used_tl, messages_used_wpp
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- leads: detectar nuevo lead por canal (instagram/whatsapp/telegram)
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- appointments: detectar nueva cita (calendar)
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- whatsapp_messages: detectar mensaje entrante de WhatsApp
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- REPLICA IDENTITY FULL en profiles para que el UPDATE envíe todas las columnas
-- (por defecto solo envía las columnas que cambiaron + PK)
ALTER TABLE profiles REPLICA IDENTITY FULL;
