-- Corrige mensajes: Pro = 2000, Full = 5000 (no ilimitados)
UPDATE plans SET messages_limit = 2000 WHERE code = 'pro';
UPDATE plans SET messages_limit = 5000 WHERE code = 'full';
