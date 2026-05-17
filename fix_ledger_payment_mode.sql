-- ============================================================
-- FIX: Add missing payment_mode column to ledger_entries
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add payment_mode column if it doesn't exist
ALTER TABLE public.ledger_entries 
ADD COLUMN IF NOT EXISTS payment_mode TEXT;

-- 2. Ensure RLS policies are correct for vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own vouchers" ON public.vouchers;
CREATE POLICY "Users can manage their own vouchers" ON public.vouchers FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = vouchers.user_id)
)
WITH CHECK (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = vouchers.user_id)
);

-- 3. Ensure RLS policies are correct for ledger_entries
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can manage their own ledger entries" ON public.ledger_entries FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = ledger_entries.user_id)
)
WITH CHECK (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = ledger_entries.user_id)
);

-- 4. Reload schema cache
NOTIFY pgrst, 'reload config';
