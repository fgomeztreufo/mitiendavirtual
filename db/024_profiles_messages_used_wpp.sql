-- 024: Agregar contador de mensajes respondidos por WhatsApp
alter table profiles
  add column if not exists messages_used_wpp integer not null default 0;
