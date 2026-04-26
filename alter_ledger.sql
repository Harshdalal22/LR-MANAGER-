-- Add payment_mode to ledger_entries table
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS payment_mode TEXT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
