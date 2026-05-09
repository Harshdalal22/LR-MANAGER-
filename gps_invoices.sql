-- SQL script to create GPS Invoices table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.gps_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_no TEXT NOT NULL UNIQUE,
    date DATE NOT NULL,
    customer_name TEXT NOT NULL,
    vehicle_no TEXT NOT NULL,
    gps_imei TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'Paid',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.gps_invoices ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to manage their own GPS Invoices
DROP POLICY IF EXISTS "Users can manage their own GPS invoices" ON public.gps_invoices;
CREATE POLICY "Users can manage their own GPS invoices" ON public.gps_invoices FOR ALL
USING (auth.uid() = user_id);

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
