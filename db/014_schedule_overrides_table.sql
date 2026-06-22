-- 014_schedule_overrides_table.sql
-- Excepciones al horario semanal: días libres, horarios especiales, bloqueos de Google Calendar.
-- is_available=false → día completamente bloqueado (vacaciones, feriado).
-- is_available=true + start/end → horario especial para esa fecha (reemplaza schedule semanal).
-- reason='google_calendar_sync' → bloqueado automáticamente por sync con Google Calendar.

create table if not exists schedule_overrides (
  id             uuid primary key default gen_random_uuid(),
  staff_id       uuid not null references staff_members(id) on delete cascade,
  override_date  date not null,
  is_available   boolean not null default false,
  start_time     time,
  end_time       time,
  reason         text,
  created_at     timestamptz not null default now(),
  unique(staff_id, override_date, start_time)
);

create index if not exists idx_overrides_staff_date on schedule_overrides(staff_id, override_date);

alter table schedule_overrides enable row level security;

create policy "ovr_select_owner" on schedule_overrides for select
  using (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "ovr_insert_owner" on schedule_overrides for insert
  with check (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "ovr_update_owner" on schedule_overrides for update
  using (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "ovr_delete_owner" on schedule_overrides for delete
  using (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "ovr_select_service_role" on schedule_overrides for select using (auth.role() = 'service_role');
create policy "ovr_insert_service_role" on schedule_overrides for insert with check (auth.role() = 'service_role');
create policy "ovr_update_service_role" on schedule_overrides for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "ovr_delete_service_role" on schedule_overrides for delete using (auth.role() = 'service_role');
