-- 025: RPC para incrementar el contador de mensajes WhatsApp
create or replace function increment_messages_wpp(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update profiles
  set messages_used_wpp = coalesce(messages_used_wpp, 0) + 1
  where id = p_user_id;
end;
$$;
