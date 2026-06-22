-- 012_appointments_table.sql
-- Tabla de citas/reservas. Soporta creación desde WhatsApp bot, dashboard, o Google Calendar.

create table if not exists appointments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  staff_id             uuid not null references staff_members(id) on delete restrict,
  service_id           uuid not null references services(id) on delete restrict,
  client_name          text not null,
  client_phone         text not null,
  client_email         text,
  starts_at            timestamptz not null,
  ends_at              timestamptz not null,
  status               text not null default 'confirmed'
                       check (status in ('pending','confirmed','cancelled','completed','no_show')),
  notes                text,
  source               text not null default 'whatsapp'
                       check (source in ('whatsapp','dashboard','google_calendar')),
  google_event_id      text,
  reminder_24h_sent    boolean not null default false,
  reminder_2h_sent     boolean not null default false,
  cancelled_at         timestamptz,
  cancellation_reason  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_appt_user_id       on appointments(user_id);
create index if not exists idx_appt_staff_starts   on appointments(staff_id, starts_at);
create index if not exists idx_appt_status         on appointments(user_id, status);
create index if not exists idx_appt_client_phone   on appointments(user_id, client_phone);
create index if not exists idx_appt_reminder
  on appointments(starts_at, status)
  where reminder_24h_sent = false or reminder_2h_sent = false;

alter table appointments enable row level security;

create policy "appt_select_owner"  on appointments for select using (auth.uid() = user_id);
create policy "appt_insert_owner"  on appointments for insert with check (auth.uid() = user_id);
create policy "appt_update_owner"  on appointments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "appt_delete_owner"  on appointments for delete using (auth.uid() = user_id);
create policy "appt_select_service_role" on appointments for select using (auth.role() = 'service_role');
create policy "appt_insert_service_role" on appointments for insert with check (auth.role() = 'service_role');
create policy "appt_update_service_role" on appointments for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create or replace function update_appt_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_appt_updated_at on appointments;
create trigger trg_appt_updated_at
  before update on appointments
  for each row execute function update_appt_updated_at();
