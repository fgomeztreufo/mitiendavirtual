-- 015_update_get_available_slots_busy_blocks.sql
-- Actualiza get_available_slots para soportar bloques ocupados parciales (Google Calendar sync).
-- Antes: is_available=false bloqueaba TODO el día sin importar start/end.
-- Ahora: is_available=false SIN horarios = día completo bloqueado.
--        is_available=false CON horarios = bloque ocupado (solo ese rango).
--        is_available=true  CON horarios = horario especial (reemplaza schedule semanal).

create or replace function get_available_slots(
  p_user_id   uuid,
  p_service_id uuid,
  p_staff_id  uuid,
  p_date      date,
  p_timezone  text default 'America/Santiago'
)
returns table(slot_start timestamptz, slot_end timestamptz)
language plpgsql security definer as $$
declare
  v_dow          integer;
  v_duration     integer;
  v_buffer       integer;
  v_step         integer;
  v_sched        record;
  v_override     record;
  v_cursor_time  time;
  v_slot_start   timestamptz;
  v_slot_end     timestamptz;
  v_has_custom   boolean := false;
  v_day_blocked  boolean := false;
begin
  select duration_minutes, buffer_minutes
  into v_duration, v_buffer
  from services
  where id = p_service_id and user_id = p_user_id;

  if not found then
    return;
  end if;

  v_step := v_duration + v_buffer;
  v_dow := extract(dow from p_date)::integer;

  -- Fase 1: Verificar si hay un override de día completo bloqueado
  if exists (
    select 1 from schedule_overrides
    where staff_id = p_staff_id
      and override_date = p_date
      and is_available = false
      and start_time is null
      and end_time is null
  ) then
    return;
  end if;

  -- Fase 2: Verificar si hay overrides con horario especial (is_available=true)
  for v_override in
    select start_time, end_time
    from schedule_overrides
    where staff_id = p_staff_id
      and override_date = p_date
      and is_available = true
      and start_time is not null
      and end_time is not null
    order by start_time
  loop
    v_has_custom := true;
    v_cursor_time := v_override.start_time;

    while v_cursor_time + (v_duration || ' minutes')::interval <= v_override.end_time loop
      v_slot_start := (p_date || ' ' || v_cursor_time)::timestamp at time zone p_timezone;
      v_slot_end   := v_slot_start + (v_duration || ' minutes')::interval;

      if v_slot_start > now() then
        -- Sin citas existentes en ese rango
        if not exists (
          select 1 from appointments
          where staff_id = p_staff_id
            and status in ('confirmed', 'pending')
            and tstzrange(starts_at, ends_at) && tstzrange(v_slot_start, v_slot_end)
        ) then
          -- Sin bloques ocupados (Google Calendar) en ese rango
          if not exists (
            select 1 from schedule_overrides
            where staff_id = p_staff_id
              and override_date = p_date
              and is_available = false
              and start_time is not null
              and end_time is not null
              and timerange(start_time, end_time) && timerange(v_cursor_time, v_cursor_time + (v_duration || ' minutes')::interval)
          ) then
            slot_start := v_slot_start;
            slot_end   := v_slot_end;
            return next;
          end if;
        end if;
      end if;

      v_cursor_time := v_cursor_time + (v_step || ' minutes')::interval;
    end loop;
  end loop;

  if v_has_custom then
    return;
  end if;

  -- Fase 3: Usar schedule semanal recurrente
  for v_sched in
    select start_time, end_time
    from schedules
    where staff_id = p_staff_id
      and day_of_week = v_dow
      and is_active = true
    order by start_time
  loop
    v_cursor_time := v_sched.start_time;

    while v_cursor_time + (v_duration || ' minutes')::interval <= v_sched.end_time loop
      v_slot_start := (p_date || ' ' || v_cursor_time)::timestamp at time zone p_timezone;
      v_slot_end   := v_slot_start + (v_duration || ' minutes')::interval;

      if v_slot_start > now() then
        -- Sin citas existentes
        if not exists (
          select 1 from appointments
          where staff_id = p_staff_id
            and status in ('confirmed', 'pending')
            and tstzrange(starts_at, ends_at) && tstzrange(v_slot_start, v_slot_end)
        ) then
          -- Sin bloques ocupados de Google Calendar
          if not exists (
            select 1 from schedule_overrides
            where staff_id = p_staff_id
              and override_date = p_date
              and is_available = false
              and start_time is not null
              and end_time is not null
              and (start_time, end_time) overlaps (v_cursor_time, v_cursor_time + (v_duration || ' minutes')::interval)
          ) then
            slot_start := v_slot_start;
            slot_end   := v_slot_end;
            return next;
          end if;
        end if;
      end if;

      v_cursor_time := v_cursor_time + (v_step || ' minutes')::interval;
    end loop;
  end loop;
end;
$$;
