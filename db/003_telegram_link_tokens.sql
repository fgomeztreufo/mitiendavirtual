-- Tabla para tokens de vinculación one-time de Telegram
create table if not exists telegram_link_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  chat_id text,
  telegram_username text,
  used boolean not null default false,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

-- Índice para búsqueda rápida por token
create index if not exists idx_telegram_link_tokens_token on telegram_link_tokens(token);

-- RLS: solo el propio usuario puede ver sus tokens
alter table telegram_link_tokens enable row level security;

create policy "Users can view own tokens"
  on telegram_link_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own tokens"
  on telegram_link_tokens for insert
  with check (auth.uid() = user_id);
