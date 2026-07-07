-- Pro y Full: mensajes ilimitados (NULL = sin límite)
UPDATE plans SET messages_limit = NULL WHERE code IN ('pro', 'full');
