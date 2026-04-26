-- SQL Script for creating the vouchers table
CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    voucher_no TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    payment_mode TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own vouchers" ON public.vouchers;
CREATE POLICY "Users can manage their own vouchers" ON public.vouchers FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = vouchers.user_id)
);

NOTIFY pgrst, 'reload config';
