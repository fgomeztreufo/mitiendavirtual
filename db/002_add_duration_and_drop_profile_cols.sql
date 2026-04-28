-- Migration: add duration_days to plans and drop plan-related columns from profiles
BEGIN;

-- 1) Add duration field to plans (in days)
ALTER TABLE IF EXISTS public.plans
  ADD COLUMN IF NOT EXISTS duration_days integer;

-- 2) Seed sensible defaults (30 days for paid plans, NULL for free)
UPDATE public.plans
SET duration_days = CASE
  WHEN code = 'free' THEN NULL
  WHEN code = 'basic' THEN 30
  WHEN code = 'pro' THEN 30
  WHEN code = 'full' THEN 30
  ELSE 30
END;

-- 3) Remove columns from profiles that are now stored per-plan
ALTER TABLE IF EXISTS public.profiles
  DROP COLUMN IF EXISTS monthly_limit,
  DROP COLUMN IF EXISTS products_limit,
  DROP COLUMN IF EXISTS messages_limit;

COMMIT;

-- NOTE:
-- - Antes de ejecutar esto en producción, verifica que todos los workflows y el frontend
--   ya leen los límites desde la tabla `plans` (messages_limit, products_limit, duration_days).
-- - Ejecuta este SQL desde el SQL Editor de Supabase o desde una conexión segura psql.
