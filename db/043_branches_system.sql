-- 043_branches_system.sql
-- Sistema de sucursales (multi-branch) para inmobiliarias, clínicas y otros nichos.

BEGIN;

-- ==================== BRANCHES TABLE ====================
CREATE TABLE IF NOT EXISTS branches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  address     text,
  phone       text,
  email       text,
  city        text,
  region      text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_user_id ON branches(user_id);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(user_id, is_active);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_select_owner" ON branches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "branch_insert_owner" ON branches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "branch_update_owner" ON branches FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "branch_delete_owner" ON branches FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "branch_select_service_role" ON branches FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "branch_all_service_role" ON branches FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_branch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_branch_updated_at ON branches;
CREATE TRIGGER trg_branch_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_branch_updated_at();

-- ==================== STAFF_MEMBERS: ADD branch_id + specialty ====================
ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS specialty text;

CREATE INDEX IF NOT EXISTS idx_staff_branch_id ON staff_members(branch_id);

-- ==================== APPOINTMENTS: ADD branch_id ====================
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appt_branch_id ON appointments(user_id, branch_id);

-- ==================== LEADS: ADD branch_id ====================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(user_id, branch_id);

-- ==================== PLANS: ADD branches_limit ====================
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS branches_limit integer DEFAULT 0;

UPDATE plans SET branches_limit = 0 WHERE code = 'free';
UPDATE plans SET branches_limit = 2 WHERE code = 'basic';
UPDATE plans SET branches_limit = 5 WHERE code = 'pro';
UPDATE plans SET branches_limit = NULL WHERE code = 'full';

COMMIT;
