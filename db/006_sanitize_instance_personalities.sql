-- Sanitize bot prompt and public reply on insert/update to remove code blocks
-- and replace dangerous keywords. This reduces risk from storing malicious
-- instructions that could be later injected into model prompts.

CREATE OR REPLACE FUNCTION public.sanitize_instance_personalities()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.bot_prompt IS NOT NULL THEN
    -- remove triple backticks and inline code markers
    NEW.bot_prompt := regexp_replace(NEW.bot_prompt, '```', '', 'g');
    NEW.bot_prompt := regexp_replace(NEW.bot_prompt, '`([^`]*)`', '', 'g');

    -- remove script tags
    NEW.bot_prompt := regexp_replace(NEW.bot_prompt, '<script[^>]*>.*?</script>', '', 'gi');

    -- replace dangerous command keywords
    NEW.bot_prompt := regexp_replace(NEW.bot_prompt, '(curl|wget|eval|exec|import|require|os\.|subprocess|ssh|scp|rm\s+-rf|sudo|nc|netcat|bash|sh|python)', '[removed]', 'gi');

    -- strip remaining html
    NEW.bot_prompt := regexp_replace(NEW.bot_prompt, '<[^>]+>', '', 'g');

    -- truncate to safe length
    IF char_length(NEW.bot_prompt) > 2000 THEN
      NEW.bot_prompt := substring(NEW.bot_prompt, 1, 2000);
    END IF;
  END IF;

  IF NEW.reply_public IS NOT NULL THEN
    NEW.reply_public := regexp_replace(NEW.reply_public, '```', '', 'g');
    NEW.reply_public := regexp_replace(NEW.reply_public, '`([^`]*)`', '', 'g');
    NEW.reply_public := regexp_replace(NEW.reply_public, '<script[^>]*>.*?</script>', '', 'gi');
    NEW.reply_public := regexp_replace(NEW.reply_public, '(curl|wget|eval|exec|import|require|os\.|subprocess|ssh|scp|rm\s+-rf|sudo|nc|netcat|bash|sh|python)', '[removed]', 'gi');
    NEW.reply_public := regexp_replace(NEW.reply_public, '<[^>]+>', '', 'g');
    IF char_length(NEW.reply_public) > 1000 THEN
      NEW.reply_public := substring(NEW.reply_public, 1, 1000);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS tg_sanitize_instance_personalities ON public.instance_personalities;
CREATE TRIGGER tg_sanitize_instance_personalities
BEFORE INSERT OR UPDATE ON public.instance_personalities
FOR EACH ROW
EXECUTE FUNCTION public.sanitize_instance_personalities();
