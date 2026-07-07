-- Migration: add admin flag for platform owner features (contabilidad, etc.)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Set admin for platform owner
UPDATE public.profiles SET is_admin = true WHERE email = 'test@mitiendavirtual.cl';
