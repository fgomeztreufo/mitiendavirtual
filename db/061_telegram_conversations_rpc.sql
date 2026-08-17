-- 061_telegram_conversations_rpc.sql
-- RPC para listar conversaciones de Telegram agrupadas por contacto.

create or replace function get_telegram_conversations(p_user_id uuid)
returns table (
  chat_id       text,
  contact_name  text,
  last_message  text,
  last_at       timestamptz,
  unread        bigint
) language sql stable security definer as $$
  select
    tm.chat_id,
    (array_agg(tm.contact_name order by tm.created_at desc))[1] as contact_name,
    (array_agg(tm.body order by tm.created_at desc))[1]        as last_message,
    max(tm.created_at)                                          as last_at,
    0::bigint                                                   as unread
  from telegram_messages tm
  where tm.user_id = p_user_id
  group by tm.chat_id
  order by max(tm.created_at) desc
  limit 100;
$$;
