-- 013_scheduling_rpc_functions.sql
-- RPCs para el bot de WhatsApp (via n8n con service_role).
-- get_available_slots: calcula slots libres considerando schedule semanal, citas existentes y overrides.
-- create_appointment: crea cita con protección contra double-booking.
-- cancel_appointment: cancela una cita existente.

-- ==================== GET_AVAILABLE_SLOTS ====================
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
  v_has_override boolean := false;
begin
  -- Obtener duración del servicio
  select duration_minutes, buffer_minutes
  into v_duration, v_buffer
  from services
  where id = p_service_id and user_id = p_user_id;

  if not found then
    return;
  end if;

  v_step := v_duration + v_buffer;
  v_dow := extract(dow from p_date)::integer;

  -- Verificar overrides para la fecha
  for v_override in
    select is_available, start_time, end_time
    from schedule_overrides
    where staff_id = p_staff_id
      and override_date = p_date
    order by start_time
  loop
    v_has_override := true;

    -- Si el override marca día libre, no hay slots
    if not v_override.is_available then
      return;
    end if;

    -- Override con horario especial
    if v_override.start_time is not null and v_override.end_time is not null then
      v_cursor_time := v_override.start_time;
      while v_cursor_time + (v_duration || ' minutes')::interval <= v_override.end_time loop
        v_slot_start := (p_date || ' ' || v_cursor_time)::timestamp at time zone p_timezone;
        v_slot_end   := v_slot_start + (v_duration || ' minutes')::interval;

        -- Verificar que no haya cita existente en ese rango
        if not exists (
          select 1 from appointments
          where staff_id = p_staff_id
            and status in ('confirmed', 'pending')
            and tstzrange(starts_at, ends_at) && tstzrange(v_slot_start, v_slot_end)
        ) then
          slot_start := v_slot_start;
          slot_end   := v_slot_end;
          return next;
        end if;

        v_cursor_time := v_cursor_time + (v_step || ' minutes')::interval;
      end loop;
    end if;
  end loop;

  -- Si hubo overrides, ya procesamos los slots arriba
  if v_has_override then
    return;
  end if;

  -- Usar schedule semanal recurrente
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

      -- No mostrar slots en el pasado
      if v_slot_start > now() then
        -- Verificar que no haya cita existente
        if not exists (
          select 1 from appointments
          where staff_id = p_staff_id
            and status in ('confirmed', 'pending')
            and tstzrange(starts_at, ends_at) && tstzrange(v_slot_start, v_slot_end)
        ) then
          slot_start := v_slot_start;
          slot_end   := v_slot_end;
          return next;
        end if;
      end if;

      v_cursor_time := v_cursor_time + (v_step || ' minutes')::interval;
    end loop;
  end loop;
end;
$$;

-- ==================== CREATE_APPOINTMENT ====================
create or replace function create_appointment(
  p_user_id      uuid,
  p_staff_id     uuid,
  p_service_id   uuid,
  p_client_name  text,
  p_client_phone text,
  p_starts_at    timestamptz,
  p_source       text default 'whatsapp'
)
returns appointments
language plpgsql security definer as $$
declare
  v_duration integer;
  v_ends_at  timestamptz;
  v_result   appointments;
begin
  -- Obtener duración
  select duration_minutes into v_duration
  from services
  where id = p_service_id and user_id = p_user_id;

  if not found then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  v_ends_at := p_starts_at + (v_duration || ' minutes')::interval;

  -- Double-booking guard
  if exists (
    select 1 from appointments
    where staff_id = p_staff_id
      and status in ('confirmed', 'pending')
      and tstzrange(starts_at, ends_at) && tstzrange(p_starts_at, v_ends_at)
  ) then
    raise exception 'SLOT_TAKEN';
  end if;

  insert into appointments (
    user_id, staff_id, service_id,
    client_name, client_phone,
    starts_at, ends_at, source
  ) values (
    p_user_id, p_staff_id, p_service_id,
    p_client_name, p_client_phone,
    p_starts_at, v_ends_at, p_source
  )
  returning * into v_result;

  return v_result;
end;
$$;

-- ==================== CANCEL_APPOINTMENT ====================
create or replace function cancel_appointment(
  p_appointment_id uuid,
  p_reason         text default null
)
returns appointments
language plpgsql security definer as $$
declare
  v_result appointments;
begin
  update appointments
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_reason
  where id = p_appointment_id
    and status in ('confirmed', 'pending')
  returning * into v_result;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND_OR_ALREADY_CANCELLED';
  end if;

  return v_result;
end;
$$;
