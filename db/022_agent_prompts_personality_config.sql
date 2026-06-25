-- 022_agent_prompts_personality_config.sql
-- Agrega columna JSONB para campos estructurados de personalidad,
-- política RLS para que el dueño pueda editar, y RPC de upsert seguro.

-- 1. Columna JSONB para config estructurada
alter table agent_prompts
  add column if not exists personality_config jsonb not null default '{}';

-- 2. Permitir al dueño actualizar sus propios prompts
create policy "agent_prompts_update_owner" on agent_prompts for update
  using (exists (
    select 1 from instances
    where instances.id = agent_prompts.instance_id
      and instances.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from instances
    where instances.id = agent_prompts.instance_id
      and instances.user_id = auth.uid()
  ));

-- 3. RPC upsert (crea la fila si no existe, actualiza si ya existe)
create or replace function upsert_agent_personality(
  p_instance_id uuid,
  p_channel text,
  p_config jsonb,
  p_system_prompt text
)
returns void language plpgsql security definer as $$
begin
  insert into agent_prompts (instance_id, channel, personality_config, system_prompt)
  values (p_instance_id, p_channel, p_config, p_system_prompt)
  on conflict (instance_id, channel) do update set
    personality_config = excluded.personality_config,
    system_prompt = excluded.system_prompt;
end;
$$;
