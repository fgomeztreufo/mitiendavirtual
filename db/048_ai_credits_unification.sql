-- 048: Unificación de créditos IA
-- Unifica los 3 contadores separados (messages_used, messages_used_tl, messages_used_wpp)
-- en un solo ai_credits_used. Elimina plan free. Desbloquea canales para todos los planes.

-- 1. Nueva columna unificada
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_credits_used integer NOT NULL DEFAULT 0;

-- 2. Backfill: sumar los 3 contadores existentes
UPDATE profiles SET ai_credits_used =
  COALESCE(messages_used, 0) +
  COALESCE(messages_used_tl, 0) +
  COALESCE(messages_used_wpp, 0);

-- 3. Trigger de sincronización: mantiene ai_credits_used sincronizado cuando
--    n8n sigue escribiendo en las columnas legacy (messages_used, messages_used_tl, messages_used_wpp)
CREATE OR REPLACE FUNCTION sync_legacy_counters()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.ai_credits_used := COALESCE(NEW.messages_used, 0)
    + COALESCE(NEW.messages_used_tl, 0)
    + COALESCE(NEW.messages_used_wpp, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_legacy_counters ON profiles;
CREATE TRIGGER trg_sync_legacy_counters
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_legacy_counters();

-- 4. RPC unificada para incrementar créditos IA
CREATE OR REPLACE FUNCTION increment_ai_credits(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET ai_credits_used = COALESCE(ai_credits_used, 0) + 1
  WHERE id = p_user_id;
END;
$$;

-- 5. Eliminar plan free de la tabla plans
DELETE FROM plans WHERE code = 'free';

-- 6. Actualizar planes: todos los canales desbloqueados, diferenciados por créditos y productos
UPDATE plans SET
  messages_limit = 500,
  description = 'Todos los canales incluidos. 500 créditos IA/mes.'
WHERE code = 'basic';

UPDATE plans SET
  messages_limit = 2000,
  description = 'Todos los canales incluidos. 2,000 créditos IA/mes.'
WHERE code = 'pro';

UPDATE plans SET
  messages_limit = 5000,
  description = 'Todos los canales + Agendamiento. 5,000 créditos IA/mes.'
WHERE code = 'full';

-- 7. Migrar usuarios free sin trial activo a trial Pro 14 días
UPDATE profiles
SET trial_plan = 'pro',
    trial_ends_at = NOW() + INTERVAL '14 days',
    original_plan = plan_type
WHERE plan_type = 'free'
  AND (trial_ends_at IS NULL OR trial_ends_at < NOW());

-- 8. Actualizar trigger de signup para que emails duplicados también reciban trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_normalized text;
  v_existing_count int;
  v_full_name text;
BEGIN
  v_normalized := normalize_email(NEW.email);
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  SELECT count(*) INTO v_existing_count
  FROM profiles
  WHERE email_normalized = v_normalized;

  IF v_existing_count > 0 THEN
    -- Email duplicado: trial más corto (7 días) como medida anti-abuso
    INSERT INTO profiles (id, email, full_name, plan_type, trial_plan, trial_ends_at, original_plan, email_normalized)
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      'basic',
      'pro',
      NOW() + INTERVAL '7 days',
      'basic',
      v_normalized
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- Primera vez: trial Pro 14 días
    INSERT INTO profiles (id, email, full_name, plan_type, trial_plan, trial_ends_at, original_plan, email_normalized)
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      'basic',
      'pro',
      NOW() + INTERVAL '14 days',
      'basic',
      v_normalized
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
