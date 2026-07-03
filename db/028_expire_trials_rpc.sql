-- 028: RPC para expirar trials vencidos (usado por cron de n8n)
-- Revierte plan_type al original_plan y limpia campos de trial
create or replace function expire_trials()
returns integer
language plpgsql security definer as $$
declare
  v_count integer;
begin
  WITH expired AS (
    UPDATE profiles
    SET plan_type = original_plan,
        trial_plan = NULL,
        trial_ends_at = NULL,
        original_plan = NULL
    WHERE trial_ends_at IS NOT NULL
      AND trial_ends_at < NOW()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;

  RETURN v_count;
end;
$$;
