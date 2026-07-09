-- Add reminder_sent flag to prevent duplicate WhatsApp template reminders
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Index for the cron query: find upcoming appointments that haven't been reminded
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_pending
ON appointments (starts_at, reminder_sent)
WHERE status != 'cancelled' AND (reminder_sent IS NULL OR reminder_sent = FALSE);
