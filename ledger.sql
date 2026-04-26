-- SQL Script for creating the ledger_entries table
-- Run this in your Supabase SQL Editor

-- Create the table
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage only their own ledger entries
DROP POLICY IF EXISTS "Users can manage their own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can manage their own ledger entries" ON public.ledger_entries FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = ledger_entries.user_id)
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
