-- 018_agent_prompts.sql
-- Tabla de prompts desacoplados por canal.
-- Cada agente (instagram, telegram, whatsapp) tiene su propio system prompt
-- independiente, administrable solo desde backend/n8n.

create table if not exists agent_prompts (
  id            uuid primary key default gen_random_uuid(),
  instance_id   uuid not null references instances(id) on delete cascade,
  channel       text not null check (channel in ('instagram', 'telegram', 'whatsapp')),
  system_prompt text not null default '',
  tools_enabled text[] not null default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(instance_id, channel)
);

create index if not exists idx_agent_prompts_instance on agent_prompts(instance_id);
create index if not exists idx_agent_prompts_lookup on agent_prompts(instance_id, channel) where is_active = true;

alter table agent_prompts enable row level security;

create policy "agent_prompts_select_owner" on agent_prompts for select
  using (exists (select 1 from instances where instances.id = instance_id and instances.user_id = auth.uid()));
create policy "agent_prompts_select_service_role" on agent_prompts for select
  using (auth.role() = 'service_role');
create policy "agent_prompts_insert_service_role" on agent_prompts for insert
  with check (auth.role() = 'service_role');
create policy "agent_prompts_update_service_role" on agent_prompts for update
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "agent_prompts_delete_service_role" on agent_prompts for delete
  using (auth.role() = 'service_role');

create or replace function update_agent_prompts_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_agent_prompts_updated_at on agent_prompts;
create trigger trg_agent_prompts_updated_at
  before update on agent_prompts
  for each row execute function update_agent_prompts_updated_at();

-- Sanitize prompt on insert/update (reuse same pattern as instance_personalities)
create or replace function sanitize_agent_prompt()
returns trigger language plpgsql as $$
begin
  if NEW.system_prompt is not null then
    NEW.system_prompt := regexp_replace(NEW.system_prompt, '```', '', 'g');
    NEW.system_prompt := regexp_replace(NEW.system_prompt, '`([^`]*)`', '', 'g');
    NEW.system_prompt := regexp_replace(NEW.system_prompt, '<script[^>]*>.*?</script>', '', 'gi');
    NEW.system_prompt := regexp_replace(NEW.system_prompt, '<[^>]+>', '', 'g');
    if char_length(NEW.system_prompt) > 4000 then
      NEW.system_prompt := substring(NEW.system_prompt, 1, 4000);
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists tg_sanitize_agent_prompt on agent_prompts;
create trigger tg_sanitize_agent_prompt
  before insert or update on agent_prompts
  for each row execute function sanitize_agent_prompt();

-- Seed: migrate existing bot_prompt from instance_personalities into per-channel prompts
-- This copies the current single prompt to all 3 channels as starting point
insert into agent_prompts (instance_id, channel, system_prompt, tools_enabled)
select
  ip.instance_id,
  ch.channel,
  coalesce(ip.bot_prompt, ''),
  case ch.channel
    when 'instagram' then array['buscador_inteligente', 'pasar_a_humano', 'cosechador_de_oro', 'el_silenciador']
    when 'telegram'  then array['buscador_inteligente', 'pasar_a_humano', 'cosechador_de_oro', 'el_silenciador']
    when 'whatsapp'  then array['buscador_inteligente', 'pasar_a_humano', 'cosechador_de_oro', 'el_silenciador']
  end
from instance_personalities ip
cross join (values ('instagram'), ('telegram'), ('whatsapp')) as ch(channel)
on conflict (instance_id, channel) do nothing;
