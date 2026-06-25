-- 023: Habilitar RLS en user_notification_configs
-- La tabla existe pero no tiene políticas de seguridad (UNRESTRICTED)

alter table public.user_notification_configs enable row level security;

-- El usuario solo puede ver sus propias configuraciones
create policy "user_notification_configs_select_own"
  on public.user_notification_configs for select
  using (auth.uid() = user_id);

-- El usuario solo puede insertar sus propias configuraciones
create policy "user_notification_configs_insert_own"
  on public.user_notification_configs for insert
  with check (auth.uid() = user_id);

-- El usuario solo puede actualizar sus propias configuraciones
create policy "user_notification_configs_update_own"
  on public.user_notification_configs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- El usuario solo puede eliminar sus propias configuraciones
create policy "user_notification_configs_delete_own"
  on public.user_notification_configs for delete
  using (auth.uid() = user_id);
