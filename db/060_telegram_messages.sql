-- 060_telegram_messages.sql
-- Log de mensajes entrantes y salientes de Telegram DMs.

create table if not exists telegram_messages (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  chat_id           text not null,
  contact_name      text,
  direction         text not null check (direction in ('inbound', 'outbound')),
  body              text not null default '',
  sender_type       text not null default 'ai',
  tg_message_id     text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_tg_msgs_user_chat
  on telegram_messages(user_id, chat_id, created_at desc);

create index if not exists idx_tg_msgs_user_recent
  on telegram_messages(user_id, created_at desc);

create unique index if not exists idx_tg_msgs_mid_unique
  on telegram_messages(tg_message_id) where tg_message_id is not null;

alter table telegram_messages enable row level security;

create policy "tg_msgs_select_owner" on telegram_messages for select
  using (auth.uid() = user_id);
create policy "tg_msgs_select_service_role" on telegram_messages for select
  using (auth.role() = 'service_role');
create policy "tg_msgs_insert_service_role" on telegram_messages for insert
  with check (auth.role() = 'service_role');

alter publication supabase_realtime add table telegram_messages;
alter table telegram_messages replica identity full;

create or replace function purge_old_telegram_messages(retention_days integer default 90)
returns integer language plpgsql security definer as $$
declare
  deleted_count integer;
begin
  delete from telegram_messages
  where created_at < now() - make_interval(days => retention_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Trigger: auto-sync usage_logs → telegram_messages
create or replace function sync_usage_log_to_tg_messages()
returns trigger language plpgsql security definer as $$
declare
  msg_text text;
  contact  text;
  det      jsonb;
  comp_id  text;
begin
  if NEW.sistema is distinct from 'Telegram' then return NEW; end if;
  if NEW.type is distinct from 'dm' then return NEW; end if;
  if NEW.user_id is null or NEW.sender_id is null then return NEW; end if;

  -- Compose unique key: sender_id + message_id (TG message IDs are per-chat)
  comp_id := NEW.sender_id || '_' || NEW.message_id;

  -- Parse details: may be JSON (new format) or plain text (legacy)
  begin
    det := NEW.details::jsonb;
    msg_text := det ->> 'mensaje';
    contact  := coalesce(det ->> 'nombre', det ->> 'username');
  exception when others then
    msg_text := NEW.details::text;
    contact  := null;
  end;

  -- Fallback: try to get name from telegram_link_tokens
  if contact is null then
    select tlt.telegram_username into contact
    from telegram_link_tokens tlt
    where tlt.chat_id = NEW.sender_id::bigint
      and tlt.used = true
    limit 1;
  end if;

  -- Inbound message
  if msg_text is not null and msg_text <> '' then
    insert into telegram_messages
      (user_id, chat_id, contact_name, direction, body, sender_type, tg_message_id, created_at)
    values
      (NEW.user_id, NEW.sender_id, contact, 'inbound', msg_text, 'ai', comp_id, NEW.created_at)
    on conflict (tg_message_id) where tg_message_id is not null
      do update set contact_name = coalesce(excluded.contact_name, telegram_messages.contact_name);
  end if;

  -- Outbound message (AI response)
  if NEW.response_ia is not null and NEW.response_ia <> '' then
    insert into telegram_messages
      (user_id, chat_id, contact_name, direction, body, sender_type, tg_message_id, created_at)
    values
      (NEW.user_id, NEW.sender_id, contact, 'outbound', NEW.response_ia, 'ai',
       comp_id || '_resp', NEW.created_at + interval '1 second')
    on conflict (tg_message_id) where tg_message_id is not null
      do update set contact_name = coalesce(excluded.contact_name, telegram_messages.contact_name);
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_sync_tg_messages on usage_logs;
create trigger trg_sync_tg_messages
  after insert or update on usage_logs
  for each row execute function sync_usage_log_to_tg_messages();
