-- 055: Instagram Product Scanner - tracking y validación
-- ig_post_id para prevenir re-importación, ig_scan_log para cooldown/auditoría,
-- RPC increment_product_count_checked para validación atómica de límites

BEGIN;

-- ============================================================
-- 1. COLUMNA ig_post_id EN PRODUCTS
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS ig_post_id text;

CREATE INDEX IF NOT EXISTS idx_products_ig_post_id
  ON products (ig_post_id) WHERE ig_post_id IS NOT NULL;

-- ============================================================
-- 2. TABLA ig_scan_log
-- ============================================================

CREATE TABLE IF NOT EXISTS ig_scan_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  posts_found integer NOT NULL DEFAULT 0,
  products_classified integer NOT NULL DEFAULT 0,
  products_imported integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ig_scan_log_user
  ON ig_scan_log (user_id, scanned_at DESC);

ALTER TABLE ig_scan_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_ig_scan_log" ON ig_scan_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_role_ig_scan_log" ON ig_scan_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 3. RPC: INCREMENTO ATÓMICO CON VALIDACIÓN DE LÍMITE
-- ============================================================

CREATE OR REPLACE FUNCTION increment_product_count_checked(
  p_user_id uuid,
  p_count integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current integer;
  v_limit   integer;
BEGIN
  SELECT p.current_products, pl.products_limit
    INTO v_current, v_limit
    FROM profiles p
    JOIN plans pl ON pl.code = p.plan_type
   WHERE p.id = p_user_id;

  IF v_current + p_count > v_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'remaining', GREATEST(v_limit - v_current, 0)
    );
  END IF;

  UPDATE profiles
     SET current_products = current_products + p_count
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'newCount', v_current + p_count
  );
END;
$$;

COMMIT;
