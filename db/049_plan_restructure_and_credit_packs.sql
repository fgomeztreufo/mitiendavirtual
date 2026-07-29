-- 049_plan_restructure_and_credit_packs.sql
-- Reestructuración de planes (basic/pro/full → inicial/pyme/pro/escala)
-- + sistema de bolsas de recarga (bonus_credits)

BEGIN;

-- ============================================================
-- 1. BONUS CREDITS EN PROFILES
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bonus_credits integer NOT NULL DEFAULT 0;

-- ============================================================
-- 2. TABLA CREDIT_PACKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.credit_packs (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  credits integer NOT NULL,
  price_clp integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_packs_read" ON public.credit_packs FOR SELECT USING (true);

INSERT INTO public.credit_packs (code, display_name, credits, price_clp, sort_order) VALUES
  ('pack_s',  'Bolsa S',  250,   6990,  1),
  ('pack_m',  'Bolsa M',  500,   11990, 2),
  ('pack_l',  'Bolsa L',  1500,  29990, 3),
  ('pack_xl', 'Bolsa XL', 3000,  49990, 4)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. TABLA CREDIT_PURCHASES (auditoría)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  pack_code text REFERENCES public.credit_packs(code),
  credits integer NOT NULL,
  amount_clp integer NOT NULL,
  payment_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_purchases_own" ON public.credit_purchases
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "credit_purchases_service" ON public.credit_purchases
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 4. MIGRAR USUARIOS EXISTENTES
-- ============================================================

-- 4a. basic → inicial
UPDATE profiles SET plan_type = 'inicial' WHERE plan_type = 'basic';
UPDATE profiles SET trial_plan = 'inicial' WHERE trial_plan = 'basic';
UPDATE profiles SET original_plan = 'inicial' WHERE original_plan = 'basic';

-- 4b. pro → pyme (usuarios actuales pagaban $44,990 por 2,000 cr)
UPDATE profiles SET plan_type = 'pyme' WHERE plan_type = 'pro';
UPDATE profiles SET trial_plan = 'pyme' WHERE trial_plan = 'pro';
UPDATE profiles SET original_plan = 'pyme' WHERE original_plan = 'pro';

-- 4c. full → escala
UPDATE profiles SET plan_type = 'escala' WHERE plan_type = 'full';
UPDATE profiles SET trial_plan = 'escala' WHERE trial_plan = 'full';
UPDATE profiles SET original_plan = 'escala' WHERE original_plan = 'full';

-- 4d. free → inicial (por si quedaron rezagados)
UPDATE profiles SET plan_type = 'inicial' WHERE plan_type = 'free';
UPDATE profiles SET original_plan = 'inicial' WHERE original_plan = 'free';

-- ============================================================
-- 5. REESTRUCTURAR TABLA PLANS
-- ============================================================

-- Borrar planes viejos
DELETE FROM plans WHERE code IN ('basic', 'full', 'free');

-- Actualizar pro (el código se reutiliza con nuevos valores)
UPDATE plans SET
  display_name = 'Pro',
  monthly_price_clp = 79900,
  messages_limit = 8000,
  products_limit = 1000,
  branches_limit = 10,
  description = 'Instagram + Telegram + WhatsApp. 8,000 créditos IA/mes.',
  channels = '["instagram","telegram","whatsapp"]'::jsonb
WHERE code = 'pro';

-- Insertar nuevos planes
INSERT INTO plans (code, display_name, monthly_price_clp, messages_limit, products_limit, branches_limit, duration_days, description, channels)
VALUES
  ('inicial', 'Inicial', 19900, 1000, 50, 2, 30,
   'Instagram + Telegram. 1,000 créditos IA/mes.',
   '["instagram","telegram"]'::jsonb),
  ('pyme', 'Pyme', 39900, 3000, 200, 5, 30,
   'Instagram + Telegram + WhatsApp. 3,000 créditos IA/mes.',
   '["instagram","telegram","whatsapp"]'::jsonb),
  ('escala', 'Escala', 149900, 20000, 5000, NULL, 30,
   'Todos los canales + Agendamiento. 20,000 créditos IA/mes.',
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
-- 6. UPDATE handle_new_user() TRIGGER
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
        plan_type = 'inicial',
        trial_plan = 'pyme',
        trial_ends_at = now() + interval '7 days',
        original_plan = 'inicial'
    WHERE id = existing_profile_id;
  ELSE
    INSERT INTO public.profiles (id, email, plan_type, trial_plan, trial_ends_at, original_plan)
    VALUES (
      NEW.id,
      NEW.email,
      'inicial',
      'pyme',
      now() + interval '14 days',
      'inicial'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 7. RPC: effective_credit_limit(user_id)
-- ============================================================
CREATE OR REPLACE FUNCTION public.effective_credit_limit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_plan_limit integer;
  v_bonus integer;
  v_plan_code text;
BEGIN
  SELECT pr.plan_type, COALESCE(pr.bonus_credits, 0)
  INTO v_plan_code, v_bonus
  FROM profiles pr
  WHERE pr.id = p_user_id;

  SELECT COALESCE(p.messages_limit, 999999)
  INTO v_plan_limit
  FROM plans p
  WHERE p.code = v_plan_code;

  IF v_plan_limit IS NULL THEN
    v_plan_limit := 1000;
  END IF;

  RETURN v_plan_limit + v_bonus;
END;
$$;

-- ============================================================
-- 8. RPC: add_bonus_credits(user_id, credits)
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_bonus_credits(p_user_id uuid, p_credits integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET bonus_credits = COALESCE(bonus_credits, 0) + p_credits
  WHERE id = p_user_id;
END;
$$;

COMMIT;
