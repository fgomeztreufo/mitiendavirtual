-- 050_expired_plan_and_verdugo_rpcs.sql
-- Plan "expired" para usuarios sin suscripción activa
-- RPC get_plan_limit para que n8n obtenga el límite de créditos de un plan

BEGIN;

-- ============================================================
-- 1. PLAN EXPIRED (0 créditos, 0 productos)
-- ============================================================
INSERT INTO plans (code, display_name, monthly_price_clp, messages_limit, products_limit, branches_limit, duration_days, description, channels)
VALUES ('expired', 'Expirado', 0, 0, 0, 0, 0, 'Plan expirado - sin suscripción activa', '[]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_clp = EXCLUDED.monthly_price_clp,
  messages_limit = EXCLUDED.messages_limit,
  products_limit = EXCLUDED.products_limit;

-- ============================================================
-- 2. RPC get_plan_limit(plan_code) → messages_limit
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_plan_limit(p_plan_code text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_limit integer;
BEGIN
  SELECT messages_limit INTO v_limit
  FROM plans
  WHERE code = p_plan_code;

  RETURN COALESCE(v_limit, 0);
END;
$$;

COMMIT;
