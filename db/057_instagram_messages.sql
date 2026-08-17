-- 057_instagram_messages.sql
-- Log de mensajes entrantes y salientes de Instagram DMs.
-- Politica de retencion: 90 dias (purgar via pg_cron o scheduled n8n workflow).

create table if not exists instagram_messages (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  ig_account_id     text not null,
  contact_ig_id     text not null,
  contact_name      text,
  direction         text not null check (direction in ('inbound', 'outbound')),
  body              text not null default '',
  sender_type       text not null default 'ai',
  ig_message_id     text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_ig_msgs_user_contact
  on instagram_messages(user_id, contact_ig_id, created_at desc);

create index if not exists idx_ig_msgs_user_recent
  on instagram_messages(user_id, created_at desc);

create unique index if not exists idx_ig_msgs_mid_unique
  on instagram_messages(ig_message_id) where ig_message_id is not null;

alter table instagram_messages enable row level security;

create policy "ig_msgs_select_owner" on instagram_messages for select
  using (auth.uid() = user_id);
create policy "ig_msgs_select_service_role" on instagram_messages for select
  using (auth.role() = 'service_role');
create policy "ig_msgs_insert_service_role" on instagram_messages for insert
  with check (auth.role() = 'service_role');

alter publication supabase_realtime add table instagram_messages;
alter table instagram_messages replica identity full;

create or replace function purge_old_instagram_messages(retention_days integer default 90)
returns integer language plpgsql security definer as $$
declare
  deleted_count integer;
begin
  delete from instagram_messages
  where created_at < now() - make_interval(days => retention_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Trigger: auto-sync usage_logs → instagram_messages
-- Fires when n8n updates a usage_logs row with response_ia (DM flow complete)
create or replace function sync_usage_log_to_ig_messages()
returns trigger language plpgsql security definer as $$
declare
  msg_text text;
  contact  text;
  det      jsonb;
begin
  if NEW.sistema is distinct from 'Instagram' then return NEW; end if;
  if NEW.type is distinct from 'message' then return NEW; end if;
  if NEW.user_id is null or NEW.sender_id is null then return NEW; end if;

  -- Parse details JSON
  begin
    det := NEW.details::jsonb;
    msg_text := det ->> 'mensaje';
    contact  := coalesce(det ->> 'nombre', det ->> 'username');
  exception when others then
    msg_text := NEW.details::text;
    contact  := null;
  end;

  -- Inbound message (from customer)
  if msg_text is not null and msg_text <> '' then
    insert into instagram_messages
      (user_id, ig_account_id, contact_ig_id, contact_name, direction, body, sender_type, ig_message_id, created_at)
    values
      (NEW.user_id, coalesce(NEW.provider_id,''), NEW.sender_id, contact, 'inbound', msg_text, 'ai', NEW.message_id, NEW.created_at)
    on conflict (ig_message_id) where ig_message_id is not null
      do update set contact_name = coalesce(excluded.contact_name, instagram_messages.contact_name);
  end if;

  -- Outbound message (AI response)
  if NEW.response_ia is not null and NEW.response_ia <> '' then
    insert into instagram_messages
      (user_id, ig_account_id, contact_ig_id, contact_name, direction, body, sender_type, ig_message_id, created_at)
    values
      (NEW.user_id, coalesce(NEW.provider_id,''), NEW.sender_id, contact, 'outbound', NEW.response_ia, 'ai',
       NEW.message_id || '_resp', NEW.created_at + interval '1 second')
    on conflict (ig_message_id) where ig_message_id is not null
      do update set contact_name = coalesce(excluded.contact_name, instagram_messages.contact_name);
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_sync_ig_messages on usage_logs;
create trigger trg_sync_ig_messages
  after insert or update on usage_logs
  for each row execute function sync_usage_log_to_ig_messages();

-- Backfill: copy existing Instagram DMs from usage_logs
insert into instagram_messages (user_id, ig_account_id, contact_ig_id, direction, body, sender_type, ig_message_id, created_at)
select
  ul.user_id,
  coalesce(ul.provider_id, ''),
  ul.sender_id,
  'inbound',
  coalesce(ul.details::jsonb ->> 'mensaje', ul.details::text, ''),
  'ai',
  ul.message_id,
  ul.created_at
from usage_logs ul
where ul.sistema = 'Instagram'
  and ul.type = 'message'
  and ul.user_id is not null
  and ul.sender_id is not null
  and ul.message_id is not null
on conflict (ig_message_id) where ig_message_id is not null do nothing;

insert into instagram_messages (user_id, ig_account_id, contact_ig_id, direction, body, sender_type, ig_message_id, created_at)
select
  ul.user_id,
  coalesce(ul.provider_id, ''),
  ul.sender_id,
  'outbound',
  ul.response_ia,
  'ai',
  ul.message_id || '_resp',
  ul.created_at + interval '1 second'
from usage_logs ul
where ul.sistema = 'Instagram'
  and ul.type = 'message'
  and ul.user_id is not null
  and ul.sender_id is not null
  and ul.response_ia is not null
  and ul.response_ia <> ''
  and ul.message_id is not null
on conflict (ig_message_id) where ig_message_id is not null do nothing;
