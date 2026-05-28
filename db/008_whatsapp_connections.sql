-- 008_whatsapp_connections.sql
-- Tabla permanente para vincular un número WhatsApp Business a una instancia/tienda.
-- El enrolamiento es directo: el merchant guarda sus credenciales desde la UI.
-- El Portero usa phone_number_id (que Meta envía en cada webhook) para hacer routing.

create table if not exists whatsapp_connections (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  instance_id                 uuid,                        -- referencia a instances (nullable por compatibilidad)
  phone_number_id             text not null unique,        -- ID del número en Meta (routing key)
  waba_id                     text,                        -- WhatsApp Business Account ID
  display_phone_number        text,                        -- número legible, ej. +56 9 XXXX XXXX
  access_token                text,                        -- token para enviar mensajes (Graph API)
  active                      boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Índices para lookup rápido desde el Portero
create index if not exists idx_wac_phone_number_id on whatsapp_connections(phone_number_id);
create index if not exists idx_wac_user_id        on whatsapp_connections(user_id);

-- RLS
alter table whatsapp_connections enable row level security;

-- El dueño puede leer/modificar su propia fila
create policy "wac_select_owner"
  on whatsapp_connections for select
  using (auth.uid() = user_id);

create policy "wac_insert_owner"
  on whatsapp_connections for insert
  with check (auth.uid() = user_id);

create policy "wac_update_owner"
  on whatsapp_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- service_role puede leer todo (para el Portero en n8n con SUPABASE_SERVICE_ROLE_KEY)
create policy "wac_select_service_role"
  on whatsapp_connections for select
  using (auth.role() = 'service_role');

create policy "wac_insert_service_role"
  on whatsapp_connections for insert
  with check (auth.role() = 'service_role');

create policy "wac_update_service_role"
  on whatsapp_connections for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Trigger updated_at
create or replace function update_wac_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_wac_updated_at on whatsapp_connections;
create trigger trg_wac_updated_at
  before update on whatsapp_connections
  for each row execute function update_wac_updated_at();
