-- 044_branches_rpc_updates.sql
-- Actualiza RPCs de agendamiento para soporte de sucursales.
-- Nuevos parámetros p_branch_id DEFAULT NULL: backward compatible.

-- ==================== GET_AVAILABLE_SLOTS (con branch) ====================
CREATE OR REPLACE FUNCTION get_available_slots(
  p_user_id    uuid,
  p_service_id uuid,
  p_staff_id   uuid,
  p_date       date,
  p_timezone   text DEFAULT 'America/Santiago',
  p_branch_id  uuid DEFAULT NULL
)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
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
  v_partial_from time := null;
BEGIN
  -- Validar que el staff pertenece a la sucursal (si se especifica)
  IF p_branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = p_staff_id AND user_id = p_user_id AND branch_id = p_branch_id
    ) THEN
      RETURN;
    END IF;
  END IF;

  SELECT duration_minutes, buffer_minutes
  INTO v_duration, v_buffer
  FROM services
  WHERE id = p_service_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_step := v_duration + v_buffer;
  v_dow := extract(dow FROM p_date)::integer;

  -- Fase 1a: Override de día completo bloqueado
  IF EXISTS (
    SELECT 1 FROM schedule_overrides
    WHERE staff_id = p_staff_id
      AND override_date = p_date
      AND is_available = false
      AND start_time IS NULL
      AND end_time IS NULL
  ) THEN
    RETURN;
  END IF;

  -- Fase 1b: Bloqueo parcial
  SELECT so.start_time INTO v_partial_from
  FROM schedule_overrides so
  WHERE so.staff_id = p_staff_id
    AND so.override_date = p_date
    AND so.is_available = false
    AND so.start_time IS NOT NULL
    AND so.end_time IS NULL
  ORDER BY so.start_time
  LIMIT 1;

  -- Fase 2: Overrides con horario especial
  FOR v_override IN
    SELECT start_time, end_time
    FROM schedule_overrides
    WHERE staff_id = p_staff_id
      AND override_date = p_date
      AND is_available = true
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL
    ORDER BY start_time
  LOOP
    v_has_custom := true;
    v_cursor_time := v_override.start_time;

    WHILE v_cursor_time + (v_duration || ' minutes')::interval <= v_override.end_time LOOP
      IF v_partial_from IS NOT NULL AND v_cursor_time >= v_partial_from THEN
        v_cursor_time := v_cursor_time + (v_step || ' minutes')::interval;
        CONTINUE;
      END IF;

      v_slot_start := (p_date || ' ' || v_cursor_time)::timestamp AT TIME ZONE p_timezone;
      v_slot_end   := v_slot_start + (v_duration || ' minutes')::interval;

      IF v_slot_start > now() THEN
        IF NOT EXISTS (
          SELECT 1 FROM appointments
          WHERE staff_id = p_staff_id
            AND status IN ('confirmed', 'pending')
            AND tstzrange(starts_at, ends_at) && tstzrange(v_slot_start, v_slot_end)
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM schedule_overrides
            WHERE staff_id = p_staff_id
              AND override_date = p_date
              AND is_available = false
              AND start_time IS NOT NULL
              AND end_time IS NOT NULL
              AND timerange(start_time, end_time) && timerange(v_cursor_time, v_cursor_time + (v_duration || ' minutes')::interval)
          ) THEN
            slot_start := v_slot_start;
            slot_end   := v_slot_end;
            RETURN NEXT;
          END IF;
        END IF;
      END IF;

      v_cursor_time := v_cursor_time + (v_step || ' minutes')::interval;
    END LOOP;
  END LOOP;

  IF v_has_custom THEN
    RETURN;
  END IF;

  -- Fase 3: Schedule semanal recurrente
  FOR v_sched IN
    SELECT start_time, end_time
    FROM schedules
    WHERE staff_id = p_staff_id
      AND day_of_week = v_dow
      AND is_active = true
    ORDER BY start_time
  LOOP
    v_cursor_time := v_sched.start_time;

    WHILE v_cursor_time + (v_duration || ' minutes')::interval <= v_sched.end_time LOOP
      IF v_partial_from IS NOT NULL AND v_cursor_time >= v_partial_from THEN
        v_cursor_time := v_cursor_time + (v_step || ' minutes')::interval;
        CONTINUE;
      END IF;

      v_slot_start := (p_date || ' ' || v_cursor_time)::timestamp AT TIME ZONE p_timezone;
      v_slot_end   := v_slot_start + (v_duration || ' minutes')::interval;

      IF v_slot_start > now() THEN
        IF NOT EXISTS (
          SELECT 1 FROM appointments
          WHERE staff_id = p_staff_id
            AND status IN ('confirmed', 'pending')
            AND tstzrange(starts_at, ends_at) && tstzrange(v_slot_start, v_slot_end)
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM schedule_overrides
            WHERE staff_id = p_staff_id
              AND override_date = p_date
              AND is_available = false
              AND start_time IS NOT NULL
              AND end_time IS NOT NULL
              AND (start_time, end_time) OVERLAPS (v_cursor_time, v_cursor_time + (v_duration || ' minutes')::interval)
          ) THEN
            slot_start := v_slot_start;
            slot_end   := v_slot_end;
            RETURN NEXT;
          END IF;
        END IF;
      END IF;

      v_cursor_time := v_cursor_time + (v_step || ' minutes')::interval;
    END LOOP;
  END LOOP;
END;
$$;

-- ==================== CREATE_APPOINTMENT (con branch) ====================
CREATE OR REPLACE FUNCTION create_appointment(
  p_user_id      uuid,
  p_staff_id     uuid,
  p_service_id   uuid,
  p_client_name  text,
  p_client_phone text,
  p_starts_at    timestamptz,
  p_source       text DEFAULT 'whatsapp',
  p_branch_id    uuid DEFAULT NULL
)
RETURNS appointments
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_duration     integer;
  v_ends_at      timestamptz;
  v_result       appointments;
  v_staff_branch uuid;
BEGIN
  SELECT duration_minutes INTO v_duration
  FROM services WHERE id = p_service_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SERVICE_NOT_FOUND';
  END IF;

  v_ends_at := p_starts_at + (v_duration || ' minutes')::interval;

  -- Auto-resolver branch: si no se pasa, heredar del staff
  IF p_branch_id IS NULL THEN
    SELECT branch_id INTO v_staff_branch FROM staff_members WHERE id = p_staff_id;
  ELSE
    v_staff_branch := p_branch_id;
  END IF;

  -- Double-booking guard
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE staff_id = p_staff_id
      AND status IN ('confirmed', 'pending')
      AND tstzrange(starts_at, ends_at) && tstzrange(p_starts_at, v_ends_at)
  ) THEN
    RAISE EXCEPTION 'SLOT_TAKEN';
  END IF;

  INSERT INTO appointments (
    user_id, staff_id, service_id,
    client_name, client_phone,
    starts_at, ends_at, source, branch_id
  ) VALUES (
    p_user_id, p_staff_id, p_service_id,
    p_client_name, p_client_phone,
    p_starts_at, v_ends_at, p_source, v_staff_branch
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- ==================== GET_BRANCH_STAFF (nuevo) ====================
CREATE OR REPLACE FUNCTION get_branch_staff(
  p_user_id    uuid,
  p_branch_id  uuid,
  p_service_id uuid DEFAULT NULL
)
RETURNS TABLE(
  staff_id   uuid,
  staff_name text,
  specialty  text,
  role       text
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT sm.id, sm.name, sm.specialty, sm.role
  FROM staff_members sm
  WHERE sm.user_id = p_user_id
    AND sm.is_active = true
    AND (p_branch_id IS NULL OR sm.branch_id = p_branch_id)
    AND (p_service_id IS NULL OR EXISTS (
      SELECT 1 FROM staff_services ss WHERE ss.staff_id = sm.id AND ss.service_id = p_service_id
    ))
  ORDER BY sm.sort_order, sm.name;
END;
$$;
