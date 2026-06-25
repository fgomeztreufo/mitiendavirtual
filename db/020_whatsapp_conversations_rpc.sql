-- 020_whatsapp_conversations_rpc.sql
-- RPC para listar conversaciones de WhatsApp agrupadas por contacto.

create or replace function get_whatsapp_conversations(p_user_id uuid)
returns table (
  contact_phone text,
  last_message text,
  last_at timestamptz,
  unread bigint
) language sql stable security definer as $$
  select
    wm.contact_phone,
    (array_agg(wm.body order by wm.created_at desc))[1] as last_message,
    max(wm.created_at) as last_at,
    0::bigint as unread
  from whatsapp_messages wm
  where wm.user_id = p_user_id
  group by wm.contact_phone
  order by max(wm.created_at) desc
  limit 100;
$$;
