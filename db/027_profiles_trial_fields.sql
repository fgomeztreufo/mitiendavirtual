-- 027: Campos para período de prueba (trial) de planes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_plan text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS original_plan text;
