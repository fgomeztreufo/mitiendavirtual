-- 056: Add scheduling_enabled toggle to profiles
ALTER TABLE profiles ADD COLUMN scheduling_enabled boolean DEFAULT false;
