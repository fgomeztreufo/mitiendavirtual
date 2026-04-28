-- Migration: create plans table and seed default plans
CREATE TABLE IF NOT EXISTS public.plans (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  monthly_price_clp integer NOT NULL DEFAULT 0,
  products_limit integer NOT NULL DEFAULT 10,
  messages_limit integer,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Seed default plans
INSERT INTO public.plans (code, display_name, monthly_price_clp, products_limit, messages_limit, description)
VALUES
  ('free', 'Semilla', 0, 10, 50, 'Plan gratuito de inicio'),
  ('basic', 'Básico', 14990, 50, 500, 'Plan ideal para emprendedores'),
  ('pro', 'Pro', 39990, 500, 2000, 'Plan para crecer con IA'),
  ('full', 'Full', 59990, 2000, NULL, 'Plan completo con mensajes ilimitados bajo política de uso justo')
ON CONFLICT (code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_clp = EXCLUDED.monthly_price_clp,
  products_limit = EXCLUDED.products_limit,
  messages_limit = EXCLUDED.messages_limit,
  description = EXCLUDED.description;

-- Indexes if needed
CREATE INDEX IF NOT EXISTS idx_plans_code ON public.plans(code);
