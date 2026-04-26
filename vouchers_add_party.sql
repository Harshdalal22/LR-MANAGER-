-- =====================================================
-- MIGRATION: Add party_name to vouchers table
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Add the party_name column to vouchers table
ALTER TABLE public.vouchers
    ADD COLUMN IF NOT EXISTS party_name TEXT;

-- Step 2: Add an index for faster lookups by party
CREATE INDEX IF NOT EXISTS idx_vouchers_party_name
    ON public.vouchers (party_name);

-- Step 3: Notify PostgREST to reload schema so the new column is immediately available
NOTIFY pgrst, 'reload config';

-- =====================================================
-- VERIFY: Run this SELECT to confirm the column was added
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'vouchers' AND column_name = 'party_name';
-- =====================================================
