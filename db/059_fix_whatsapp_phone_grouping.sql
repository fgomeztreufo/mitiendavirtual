-- 059_fix_whatsapp_phone_grouping.sql
-- Normaliza contact_phone quitando prefijo '+' para agrupar correctamente.

-- Normalizar datos existentes
update whatsapp_messages
set contact_phone = regexp_replace(contact_phone, '^\+', '')
where contact_phone like '+%';

-- Recrear RPC con normalizacion
create or replace function get_whatsapp_conversations(p_user_id uuid)
returns table (
  contact_phone text,
  last_message text,
  last_at timestamptz,
  unread bigint
) language sql stable security definer as $$
  select
    regexp_replace(wm.contact_phone, '^\+', '') as contact_phone,
    (array_agg(wm.body order by wm.created_at desc))[1] as last_message,
    max(wm.created_at) as last_at,
    0::bigint as unread
  from whatsapp_messages wm
  where wm.user_id = p_user_id
  group by regexp_replace(wm.contact_phone, '^\+', '')
  order by max(wm.created_at) desc
  limit 100;
$$;
