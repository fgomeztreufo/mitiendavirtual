-- TEST: Activar trial de 30 días del plan Full para usuario de prueba
-- Ejecutar en Supabase SQL Editor

-- 1. Ver estado actual
SELECT id, plan_type, trial_plan, trial_ends_at, original_plan
FROM profiles
WHERE id = 'dcbbe3e4-b3d9-4359-9cea-97446e86351b';

-- 2. Activar trial Full por 30 días
UPDATE profiles SET
  original_plan = plan_type,
  trial_plan = 'full',
  trial_ends_at = NOW() + INTERVAL '30 days',
  plan_type = 'full'
WHERE id = 'dcbbe3e4-b3d9-4359-9cea-97446e86351b';

-- 3. Verificar que se activó
SELECT id, plan_type, trial_plan, trial_ends_at, original_plan
FROM profiles
WHERE id = 'dcbbe3e4-b3d9-4359-9cea-97446e86351b';
