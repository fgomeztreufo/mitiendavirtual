-- Add user_id to chat_states for multi-tenant isolation
ALTER TABLE public.chat_states
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_chat_states_user_id
  ON public.chat_states (user_id);

-- RLS: users can only see/modify their own chat states
ALTER TABLE public.chat_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_states_user_policy ON public.chat_states
  FOR ALL
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
