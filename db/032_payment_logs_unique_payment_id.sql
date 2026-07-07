-- Migration: prevent duplicate IPN entries and add accounting fields
-- Mercado Pago retries IPN notifications, causing duplicate inserts for the same payment.

-- 1. Prevent duplicates
ALTER TABLE public.payment_logs
  ADD CONSTRAINT payment_logs_payment_id_unique UNIQUE (payment_id);

-- 2. Accounting fields from MP IPN response
ALTER TABLE public.payment_logs
  ADD COLUMN IF NOT EXISTS payer_email text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS mp_fee numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric(10,2) DEFAULT 0;
