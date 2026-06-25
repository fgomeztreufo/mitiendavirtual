-- 019_whatsapp_messages.sql
-- Log de mensajes entrantes y salientes de WhatsApp para visor read-only.
-- Politica de retencion: 90 dias (purgar via pg_cron o scheduled n8n workflow).

create table if not exists whatsapp_messages (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  phone_number_id   text not null,
  contact_phone     text not null,
  direction         text not null check (direction in ('inbound', 'outbound')),
  body              text not null default '',
  media_url         text,
  wamid             text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_wpp_msgs_user_contact
  on whatsapp_messages(user_id, contact_phone, created_at desc);

create index if not exists idx_wpp_msgs_user_recent
  on whatsapp_messages(user_id, created_at desc);

alter table whatsapp_messages enable row level security;

create policy "wpp_msgs_select_owner" on whatsapp_messages for select
  using (auth.uid() = user_id);
create policy "wpp_msgs_select_service_role" on whatsapp_messages for select
  using (auth.role() = 'service_role');
create policy "wpp_msgs_insert_service_role" on whatsapp_messages for insert
  with check (auth.role() = 'service_role');

-- RPC for cleanup (call from n8n scheduled workflow or pg_cron)
create or replace function purge_old_whatsapp_messages(retention_days integer default 90)
returns integer language plpgsql security definer as $$
declare
  deleted_count integer;
begin
  delete from whatsapp_messages
  where created_at < now() - make_interval(days => retention_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
