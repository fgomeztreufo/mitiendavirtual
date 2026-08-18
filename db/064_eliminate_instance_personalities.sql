-- 064_eliminate_instance_personalities.sql
-- Migra campos IG (activation_keyword, antispam_enabled, reply_public) de
-- instance_personalities a agent_prompts.personality_config JSONB.
-- Crea vista de compatibilidad para n8n, luego drop tabla legacy.

-- 1. Migrar datos existentes a agent_prompts (canal instagram)
UPDATE agent_prompts ap
SET personality_config = ap.personality_config
  || jsonb_build_object(
       'activation_keyword', COALESCE(ip.activation_keyword, ''),
       'antispam_enabled',   COALESCE(ip.antispam_enabled, false),
       'reply_public',       COALESCE(ip.reply_public, '')
     )
FROM instance_personalities ip
WHERE ip.instance_id = ap.instance_id
  AND ap.channel = 'instagram'
  AND ap.is_active = true;

-- 2. Migrar reply_public al canal whatsapp (usado por WPP n8n)
UPDATE agent_prompts ap
SET personality_config = ap.personality_config
  || jsonb_build_object('reply_public', COALESCE(ip.reply_public, ''))
FROM instance_personalities ip
WHERE ip.instance_id = ap.instance_id
  AND ap.channel = 'whatsapp'
  AND ap.is_active = true
  AND COALESCE(ip.reply_public, '') <> '';

-- 3. Para instancias SIN fila en agent_prompts, crear una con los datos legacy
INSERT INTO agent_prompts (instance_id, channel, system_prompt, personality_config)
SELECT
  ip.instance_id,
  'instagram',
  COALESCE(ip.bot_prompt, ''),
  jsonb_build_object(
    'ai_name',            COALESCE(ip.ai_name, ip.biz_name, ''),
    'tone',               'amigable',
    'greeting',           '',
    'business_rules',     '',
    'activation_keyword', COALESCE(ip.activation_keyword, ''),
    'antispam_enabled',   COALESCE(ip.antispam_enabled, false),
    'reply_public',       COALESCE(ip.reply_public, '')
  )
FROM instance_personalities ip
WHERE NOT EXISTS (
  SELECT 1 FROM agent_prompts ap
  WHERE ap.instance_id = ip.instance_id AND ap.channel = 'instagram'
)
ON CONFLICT (instance_id, channel) DO NOTHING;

-- 4. Drop trigger y función de sanitización legacy
DROP TRIGGER IF EXISTS tg_sanitize_instance_personalities ON instance_personalities;
DROP FUNCTION IF EXISTS sanitize_instance_personalities();

-- 5. Renombrar tabla a backup (más seguro que drop directo)
ALTER TABLE instance_personalities RENAME TO instance_personalities_deprecated;

-- 6. Crear vista de compatibilidad para n8n (transitoria)
CREATE OR REPLACE VIEW instance_personalities AS
SELECT
  ap.instance_id,
  (ap.personality_config->>'ai_name')            AS ai_name,
  (ap.personality_config->>'ai_name')            AS biz_name,
  ap.system_prompt                               AS bot_prompt,
  ap.system_prompt                               AS personality,
  ap.system_prompt                               AS system_prompt,
  (ap.personality_config->>'tone')               AS ai_tone,
  (ap.personality_config->>'activation_keyword')  AS activation_keyword,
  (ap.personality_config->>'antispam_enabled')::boolean AS antispam_enabled,
  (ap.personality_config->>'reply_public')        AS reply_public
FROM agent_prompts ap
WHERE ap.is_active = true;

-- 7. RPC para actualizar settings IG (merge parcial en personality_config)
CREATE OR REPLACE FUNCTION update_ig_settings(
  p_instance_id uuid,
  p_activation_keyword text,
  p_antispam_enabled boolean,
  p_reply_public text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE agent_prompts
  SET personality_config = personality_config
    || jsonb_build_object(
         'activation_keyword', p_activation_keyword,
         'antispam_enabled',   p_antispam_enabled,
         'reply_public',       p_reply_public
       )
  WHERE instance_id = p_instance_id
    AND channel = 'instagram'
    AND is_active = true;

  IF NOT FOUND THEN
    INSERT INTO agent_prompts (instance_id, channel, system_prompt, personality_config)
    VALUES (
      p_instance_id,
      'instagram',
      '',
      jsonb_build_object(
        'ai_name', '',
        'tone', 'amigable',
        'greeting', '',
        'business_rules', '',
        'activation_keyword', p_activation_keyword,
        'antispam_enabled', p_antispam_enabled,
        'reply_public', p_reply_public
      )
    );
  END IF;
END;
$$;
