-- 058_instagram_conversations_rpc.sql
-- RPC para listar conversaciones de Instagram agrupadas por contacto.

create or replace function get_instagram_conversations(p_user_id uuid)
returns table (
  contact_ig_id text,
  contact_name  text,
  last_message  text,
  last_at       timestamptz,
  unread        bigint
) language sql stable security definer as $$
  select
    im.contact_ig_id,
    (array_agg(im.contact_name order by im.created_at desc))[1] as contact_name,
    (array_agg(im.body order by im.created_at desc))[1]        as last_message,
    max(im.created_at)                                          as last_at,
    0::bigint                                                   as unread
  from instagram_messages im
  where im.user_id = p_user_id
  group by im.contact_ig_id
  order by max(im.created_at) desc
  limit 100;
$$;
