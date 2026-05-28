-- 009_drop_whatsapp_link_tokens.sql
-- La tabla whatsapp_link_tokens ya no se usa.
-- El enrolamiento de WhatsApp es directo: los merchants guardan sus credenciales
-- desde la UI y el Portero hace routing por phone_number_id en whatsapp_connections.

drop table if exists whatsapp_link_tokens;
