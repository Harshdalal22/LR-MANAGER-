-- ==========================================
-- FINAL FIX FOR VOUCHERS AND LEDGERS
-- COPY ALL OF THIS AND RUN IN SUPABASE SQL EDITOR
-- ==========================================

-- 1. Create Vouchers Table
CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    voucher_no TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    payment_mode TEXT NOT NULL,
    party_name TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure party_name exists in case table was already there
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS party_name TEXT;

-- Enable RLS for Vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own vouchers" ON public.vouchers;
CREATE POLICY "Users can manage their own vouchers" ON public.vouchers FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = vouchers.user_id)
);

-- 2. Create Ledger Entries Table
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    invoice_no TEXT,
    voucher_no TEXT,
    credit NUMERIC DEFAULT 0,
    debit NUMERIC DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Ledger
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can manage their own ledger entries" ON public.ledger_entries FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = ledger_entries.user_id)
);

-- 3. Reload Schema
NOTIFY pgrst, 'reload config';
