-- 052_open_channels_plan_restructure.sql
-- Modelo híbrido: todos los canales abiertos, monetización por créditos IA.
-- Nuevos tiers: free / emprendedor / negocio / escala
-- Elimina trial system, elimina gating de canales.

BEGIN;

-- ============================================================
-- 1. MIGRAR USUARIOS EXISTENTES
-- ============================================================

-- inicial → free
UPDATE profiles SET plan_type = 'free' WHERE plan_type = 'inicial';
UPDATE profiles SET original_plan = 'free' WHERE original_plan = 'inicial';

-- pyme → negocio
UPDATE profiles SET plan_type = 'negocio' WHERE plan_type = 'pyme';
UPDATE profiles SET original_plan = 'negocio' WHERE original_plan = 'pyme';

-- pro → negocio (features equivalentes, mejor precio)
UPDATE profiles SET plan_type = 'negocio' WHERE plan_type = 'pro';
UPDATE profiles SET original_plan = 'negocio' WHERE original_plan = 'pro';

-- escala se mantiene

-- legacy codes por si quedaron
UPDATE profiles SET plan_type = 'free' WHERE plan_type IN ('basic', 'basico', 'semilla');
UPDATE profiles SET plan_type = 'escala' WHERE plan_type IN ('full', 'completo');

-- ============================================================
-- 2. LIMPIAR TRIAL SYSTEM
-- ============================================================
UPDATE profiles SET
  trial_plan = NULL,
  trial_ends_at = NULL,
  original_plan = NULL
WHERE trial_plan IS NOT NULL OR trial_ends_at IS NOT NULL;

-- ============================================================
-- 3. REESTRUCTURAR TABLA PLANS
-- ============================================================

-- Borrar planes que ya no existen
DELETE FROM plans WHERE code IN ('inicial', 'pyme', 'pro');

-- Insertar/actualizar nuevos planes
-- Todos los canales abiertos, branches ilimitadas, scheduling incluido
INSERT INTO plans (code, display_name, monthly_price_clp, messages_limit, products_limit, branches_limit, duration_days, description, channels)
VALUES
  ('free', 'Gratis', 0, 100, 10, NULL, NULL,
   'Todos los canales. 100 créditos IA/mes. Ideal para probar.',
   '["instagram","telegram","whatsapp","google_calendar"]'::jsonb),
  ('emprendedor', 'Emprendedor', 19900, 1500, 100, NULL, 30,
   'Todos los canales. 1,500 créditos IA/mes.',
   '["instagram","telegram","whatsapp","google_calendar"]'::jsonb),
  ('negocio', 'Negocio', 49900, 5000, 500, NULL, 30,
   'Todos los canales. 5,000 créditos IA/mes.',
   '["instagram","telegram","whatsapp","google_calendar"]'::jsonb),
  ('escala', 'Escala', 99900, 15000, 2000, NULL, 30,
   'Todos los canales. 15,000 créditos IA/mes.',
   '["instagram","telegram","whatsapp","google_calendar"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_clp = EXCLUDED.monthly_price_clp,
  messages_limit = EXCLUDED.messages_limit,
  products_limit = EXCLUDED.products_limit,
  branches_limit = EXCLUDED.branches_limit,
  duration_days = EXCLUDED.duration_days,
  description = EXCLUDED.description,
  channels = EXCLUDED.channels;

-- ============================================================
-- 4. UPDATE handle_new_user() TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_profile_id uuid;
BEGIN
  SELECT id INTO existing_profile_id
  FROM public.profiles
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET id = NEW.id,
        updated_at = now(),
        plan_type = 'free'
    WHERE id = existing_profile_id;
  ELSE
    INSERT INTO public.profiles (id, email, plan_type)
    VALUES (NEW.id, NEW.email, 'free');
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. UPDATE effective_credit_limit() RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.effective_credit_limit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_type text;
  v_plan_limit integer;
  v_bonus integer;
BEGIN
  SELECT plan_type, COALESCE(bonus_credits, 0)
  INTO v_plan_type, v_bonus
  FROM profiles
  WHERE id = p_user_id;

  IF v_plan_type IS NULL THEN
    RETURN 100;
  END IF;

  SELECT messages_limit INTO v_plan_limit
  FROM plans
  WHERE code = v_plan_type;

  IF v_plan_limit IS NULL THEN
    RETURN 100 + v_bonus;
  END IF;

  RETURN v_plan_limit + v_bonus;
END;
$$;

-- ============================================================
-- 6. UPDATE expire_trials() - ahora es no-op, pero lo dejamos
-- por compatibilidad con el cron de n8n
-- ============================================================
DROP FUNCTION IF EXISTS public.expire_trials();
CREATE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Trial system eliminado. Esta función existe por compatibilidad
  -- con crons de n8n que aún la llamen.
  NULL;
END;
$$;

COMMIT;
