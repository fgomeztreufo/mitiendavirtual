-- 042: Auto-trial de 14 días al registrarse + prevención de abuso
-- Crea profile automáticamente al signup con trial Pro de 14 días.
-- Normaliza email para detectar cuentas duplicadas (Gmail +alias, dots).

-- a) Columna para email normalizado
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_normalized text;

-- b) Función para normalizar email
CREATE OR REPLACE FUNCTION normalize_email(raw_email text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  local_part text;
  domain text;
BEGIN
  raw_email := lower(trim(raw_email));
  local_part := split_part(raw_email, '@', 1);
  domain := split_part(raw_email, '@', 2);

  -- Quitar +alias para todos los dominios
  local_part := split_part(local_part, '+', 1);

  -- Quitar dots en Gmail/Googlemail (Google ignora los puntos)
  IF domain IN ('gmail.com', 'googlemail.com') THEN
    local_part := replace(local_part, '.', '');
  END IF;

  RETURN local_part || '@' || domain;
END;
$$;

-- c) Backfill email normalizado para profiles existentes
UPDATE profiles SET email_normalized = normalize_email(email)
WHERE email_normalized IS NULL AND email IS NOT NULL;

-- d) Index para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_profiles_email_normalized ON profiles(email_normalized);

-- e) Función trigger: crea profile al registrarse
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

  -- Verificar si ya existe un profile con el mismo email normalizado
  SELECT count(*) INTO v_existing_count
  FROM profiles
  WHERE email_normalized = v_normalized;

  IF v_existing_count > 0 THEN
    -- Email duplicado (con alias/dots): crear sin trial
    INSERT INTO profiles (id, email, full_name, plan_type, email_normalized)
    VALUES (NEW.id, NEW.email, v_full_name, 'free', v_normalized)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- Primera vez con este email: dar trial Pro 14 días
    INSERT INTO profiles (id, email, full_name, plan_type, trial_plan, trial_ends_at, original_plan, email_normalized)
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      'free',
      'pro',
      NOW() + INTERVAL '14 days',
      'free',
      v_normalized
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- f) Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
