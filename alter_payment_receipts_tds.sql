-- Add tds_amount and total_amount to payment_receipts table
ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS tds_amount NUMERIC DEFAULT 0;
ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload config';
