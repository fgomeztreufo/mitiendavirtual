-- 046_drop_unique_original_id_saas.sql
-- Elimina constraint unique en original_id_saas de documents.
-- El cron de re-indexación (cada 30 min) ya borra y re-crea todos los docs,
-- así que la unicidad no es necesaria y bloquea inserciones individuales.

ALTER TABLE documents DROP CONSTRAINT IF EXISTS unique_original_id_saas;
