-- 054: Sistema de referidos con créditos IA
-- Código único por usuario, tabla de referrals, anti-abuso con email normalization

BEGIN;

-- ============================================================
-- 1. CAMPOS EN PROFILES
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON profiles (referral_code) WHERE referral_code IS NOT NULL;

-- Generar código para usuarios existentes (8 chars alfanuméricos basados en id)
UPDATE profiles
SET referral_code = upper(substr(md5(id::text || 'mtv-ref'), 1, 8))
WHERE referral_code IS NULL;

-- Asegurar email_normalized está actualizado
UPDATE profiles SET email_normalized = normalize_email(email)
WHERE email IS NOT NULL AND (email_normalized IS NULL OR email_normalized != normalize_email(email));

-- ============================================================
-- 2. TABLA REFERRALS
-- ============================================================

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'activated', 'credited')),
  credits_amount int NOT NULL DEFAULT 500,
  referrer_credited_at timestamptz,
  referred_credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_referred UNIQUE (referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (status);

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "service_role_referrals" ON referrals
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 3. FUNCIONES RPC
-- ============================================================

-- Verificar tope mensual de referidos (max 10/mes)
CREATE OR REPLACE FUNCTION check_monthly_referral_limit(p_referrer_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT count(*) < 10
  FROM referrals
  WHERE referrer_id = p_referrer_id
    AND created_at >= date_trunc('month', now());
$$;

-- Procesar registro de referido (llamado desde handle_new_user o manualmente)
CREATE OR REPLACE FUNCTION process_referral(
  p_referred_id uuid,
  p_referral_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_referred_email_norm text;
  v_referrer_email_norm text;
  v_existing_referral uuid;
BEGIN
  IF p_referral_code IS NULL OR trim(p_referral_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_code');
  END IF;

  -- Buscar referidor por código
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = upper(trim(p_referral_code));

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  -- No auto-referirse
  IF v_referrer_id = p_referred_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  -- Anti-abuso: verificar email normalizado distinto
  SELECT email_normalized INTO v_referred_email_norm
  FROM profiles WHERE id = p_referred_id;

  SELECT email_normalized INTO v_referrer_email_norm
  FROM profiles WHERE id = v_referrer_id;

  IF v_referred_email_norm IS NOT NULL
     AND v_referrer_email_norm IS NOT NULL
     AND v_referred_email_norm = v_referrer_email_norm THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'same_email');
  END IF;

  -- Verificar que no ya fue referido
  SELECT id INTO v_existing_referral
  FROM referrals WHERE referred_id = p_referred_id;

  IF v_existing_referral IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  -- Verificar tope mensual del referidor
  IF NOT check_monthly_referral_limit(v_referrer_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'monthly_limit');
  END IF;

  -- Crear referral + acreditar 500 bonus al referido inmediatamente
  INSERT INTO referrals (referrer_id, referred_id, status, credits_amount, referred_credited_at)
  VALUES (v_referrer_id, p_referred_id, 'pending', 500, now());

  UPDATE profiles
  SET referred_by = v_referrer_id,
      bonus_credits = COALESCE(bonus_credits, 0) + 500
  WHERE id = p_referred_id;

  RETURN jsonb_build_object(
    'ok', true,
    'referrer_id', v_referrer_id,
    'credits_given', 500
  );
END;
$$;

-- Verificar activación de referido y acreditar al referidor
CREATE OR REPLACE FUNCTION check_referral_activation(p_referred_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_referral referrals%ROWTYPE;
  v_is_activated boolean := false;
  v_has_ig boolean;
  v_has_tg boolean;
  v_has_wpp boolean;
  v_credits_used int;
BEGIN
  -- Buscar referral pendiente
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_referred_id AND status = 'pending';

  IF v_referral IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_pending_referral');
  END IF;

  -- Verificar si conectó algún canal
  SELECT EXISTS (
    SELECT 1 FROM instances
    WHERE user_id = p_referred_id AND provider_id IS NOT NULL
  ) INTO v_has_ig;

  SELECT EXISTS (
    SELECT 1 FROM telegram_link_tokens
    WHERE user_id = p_referred_id AND used = true AND chat_id IS NOT NULL
  ) INTO v_has_tg;

  SELECT EXISTS (
    SELECT 1 FROM whatsapp_connections
    WHERE user_id = p_referred_id AND active = true
  ) INTO v_has_wpp;

  -- Verificar créditos usados
  SELECT COALESCE(ai_credits_used, 0) INTO v_credits_used
  FROM profiles WHERE id = p_referred_id;

  v_is_activated := v_has_ig OR v_has_tg OR v_has_wpp OR v_credits_used >= 20;

  IF NOT v_is_activated THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_activated');
  END IF;

  -- Activar: acreditar 500 bonus al referidor
  UPDATE referrals
  SET status = 'activated',
      referrer_credited_at = now()
  WHERE id = v_referral.id;

  UPDATE profiles
  SET bonus_credits = COALESCE(bonus_credits, 0) + v_referral.credits_amount
  WHERE id = v_referral.referrer_id;

  RETURN jsonb_build_object(
    'ok', true,
    'referrer_id', v_referral.referrer_id,
    'credits_given', v_referral.credits_amount
  );
END;
$$;

-- Obtener stats de referidos para un usuario
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total int;
  v_pending int;
  v_activated int;
  v_credits_earned int;
  v_referral_code text;
BEGIN
  SELECT referral_code INTO v_referral_code
  FROM profiles WHERE id = p_user_id;

  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'activated'),
    COALESCE(sum(credits_amount) FILTER (WHERE status = 'activated'), 0)
  INTO v_total, v_pending, v_activated, v_credits_earned
  FROM referrals
  WHERE referrer_id = p_user_id;

  RETURN jsonb_build_object(
    'referral_code', v_referral_code,
    'total', v_total,
    'pending', v_pending,
    'activated', v_activated,
    'credits_earned', v_credits_earned,
    'monthly_remaining', 10 - (
      SELECT count(*) FROM referrals
      WHERE referrer_id = p_user_id
        AND created_at >= date_trunc('month', now())
    )
  );
END;
$$;

-- ============================================================
-- 4. UPDATE handle_new_user() — con referral + email normalization
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_profile_id uuid;
  v_referral_code text;
  v_ref_result jsonb;
BEGIN
  SELECT id INTO existing_profile_id
  FROM public.profiles
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET id = NEW.id,
        updated_at = now(),
        plan_type = 'free',
        email_normalized = normalize_email(NEW.email)
    WHERE id = existing_profile_id;
  ELSE
    INSERT INTO public.profiles (id, email, plan_type, email_normalized, referral_code)
    VALUES (
      NEW.id,
      NEW.email,
      'free',
      normalize_email(NEW.email),
      upper(substr(md5(NEW.id::text || 'mtv-ref'), 1, 8))
    );
  END IF;

  -- Procesar referral si viene en metadata
  v_referral_code := NEW.raw_user_meta_data ->> 'referral_code';
  IF v_referral_code IS NOT NULL AND trim(v_referral_code) != '' THEN
    PERFORM process_referral(NEW.id, v_referral_code);
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
