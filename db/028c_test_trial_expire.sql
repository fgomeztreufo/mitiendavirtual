-- TEST: Simular expiración del trial (forzar que expire ahora)
-- Ejecutar en Supabase SQL Editor

-- 1. Forzar que el trial ya venció (poner fecha pasada)
UPDATE profiles SET
  trial_ends_at = NOW() - INTERVAL '1 hour'
WHERE id = 'dcbbe3e4-b3d9-4359-9cea-97446e86351b';

-- 2. Ejecutar el RPC de expiración (simula lo que hace el cron de n8n)
SELECT expire_trials();

-- 3. Verificar que volvió al plan original
SELECT id, plan_type, trial_plan, trial_ends_at, original_plan
FROM profiles
WHERE id = 'dcbbe3e4-b3d9-4359-9cea-97446e86351b';
