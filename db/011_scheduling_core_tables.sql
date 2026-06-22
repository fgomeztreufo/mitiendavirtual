-- 011_scheduling_core_tables.sql
-- Tablas base del sistema de agendamiento: profesionales, servicios, asignaciones y horarios semanales.
-- Aplica para cualquier negocio de servicios (barbería, spa, clínica, etc.)
-- Solo disponible para plan Full.

-- ==================== STAFF_MEMBERS ====================
create table if not exists staff_members (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  role              text,
  email             text,
  phone             text,
  avatar_url        text,
  is_active         boolean not null default true,
  google_calendar_id text,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_staff_user_id on staff_members(user_id);
create index if not exists idx_staff_active  on staff_members(user_id, is_active);

alter table staff_members enable row level security;

create policy "staff_select_owner"  on staff_members for select using (auth.uid() = user_id);
create policy "staff_insert_owner"  on staff_members for insert with check (auth.uid() = user_id);
create policy "staff_update_owner"  on staff_members for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "staff_delete_owner"  on staff_members for delete using (auth.uid() = user_id);
create policy "staff_select_service_role" on staff_members for select using (auth.role() = 'service_role');
create policy "staff_insert_service_role" on staff_members for insert with check (auth.role() = 'service_role');
create policy "staff_update_service_role" on staff_members for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create or replace function update_staff_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_staff_updated_at on staff_members;
create trigger trg_staff_updated_at
  before update on staff_members
  for each row execute function update_staff_updated_at();

-- ==================== SERVICES ====================
create table if not exists services (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  description       text,
  duration_minutes  integer not null default 30,
  price             integer,
  buffer_minutes    integer not null default 0,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_services_user_id on services(user_id);
create index if not exists idx_services_active  on services(user_id, is_active);

alter table services enable row level security;

create policy "svc_select_owner"  on services for select using (auth.uid() = user_id);
create policy "svc_insert_owner"  on services for insert with check (auth.uid() = user_id);
create policy "svc_update_owner"  on services for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "svc_delete_owner"  on services for delete using (auth.uid() = user_id);
create policy "svc_select_service_role" on services for select using (auth.role() = 'service_role');

create or replace function update_services_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_services_updated_at on services;
create trigger trg_services_updated_at
  before update on services
  for each row execute function update_services_updated_at();

-- ==================== STAFF_SERVICES (junction) ====================
create table if not exists staff_services (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff_members(id) on delete cascade,
  service_id  uuid not null references services(id) on delete cascade,
  unique(staff_id, service_id)
);

alter table staff_services enable row level security;

create policy "ss_select_owner" on staff_services for select
  using (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "ss_insert_owner" on staff_services for insert
  with check (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "ss_delete_owner" on staff_services for delete
  using (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "ss_select_service_role" on staff_services for select using (auth.role() = 'service_role');

-- ==================== SCHEDULES (weekly recurring) ====================
create table if not exists schedules (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff_members(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  is_active   boolean not null default true,
  constraint schedules_time_check check (end_time > start_time),
  unique(staff_id, day_of_week, start_time)
);

create index if not exists idx_schedules_staff_id on schedules(staff_id);

alter table schedules enable row level security;

create policy "sched_select_owner" on schedules for select
  using (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "sched_insert_owner" on schedules for insert
  with check (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "sched_update_owner" on schedules for update
  using (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "sched_delete_owner" on schedules for delete
  using (exists (select 1 from staff_members where staff_members.id = staff_id and staff_members.user_id = auth.uid()));
create policy "sched_select_service_role" on schedules for select using (auth.role() = 'service_role');
