-- Tabla para tokens/vinculación de WhatsApp (MVP)
create table if not exists whatsapp_link_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  phone_number_id text,
  whatsapp_business_account_id text,
  access_token text,
  display_phone_number text,
  used boolean not null default false,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_link_tokens_token on whatsapp_link_tokens(token);
create index if not exists idx_whatsapp_link_tokens_phone_number on whatsapp_link_tokens(phone_number_id);

-- Habilitar RLS y políticas similares a telegram_link_tokens
alter table whatsapp_link_tokens enable row level security;

create policy "Users can view own whatsapp tokens"
  on whatsapp_link_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own whatsapp tokens"
  on whatsapp_link_tokens for insert
  with check (auth.uid() = user_id);
