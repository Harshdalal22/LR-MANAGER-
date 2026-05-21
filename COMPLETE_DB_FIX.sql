-- ============================================================
-- COMPLETE DATABASE FIX - RUN THIS ENTIRE SCRIPT IN SUPABASE
-- Go to: Supabase Dashboard > SQL Editor > New Query > Paste > Run
-- ============================================================

-- 1. LORRY RECEIPTS TABLE
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "invoiceNo" TEXT;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "invoiceAmount" NUMERIC;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "invoiceDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "poDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "ewayBillDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "ewayExDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS is_invoice_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS pod_path TEXT;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS consignor JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS consignee JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "billingTo" JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS charges JSONB;

-- Make sure the upsert key is set correctly
ALTER TABLE public.lorry_receipts DROP CONSTRAINT IF EXISTS "lorry_receipts_lrNo_key";
ALTER TABLE public.lorry_receipts ADD CONSTRAINT "lorry_receipts_lrNo_key" UNIQUE ("lrNo");

-- Allow null dates (important!)
ALTER TABLE public.lorry_receipts ALTER COLUMN "invoiceDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "poDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "ewayBillDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "ewayExDate" DROP NOT NULL;

-- RLS for lorry_receipts
ALTER TABLE public.lorry_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own LRs" ON public.lorry_receipts;
CREATE POLICY "Users can manage their own LRs" ON public.lorry_receipts FOR ALL
USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.lorry_receipts.user_id)
);

-- 2. VOUCHERS TABLE
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
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS party_name TEXT;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own vouchers" ON public.vouchers;
CREATE POLICY "Users can manage their own vouchers" ON public.vouchers FOR ALL
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = vouchers.user_id)
);

-- 3. LEDGER ENTRIES TABLE
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
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can manage their own ledger entries" ON public.ledger_entries FOR ALL
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = ledger_entries.user_id)
);

-- 4. COMPANY DETAILS
ALTER TABLE public.company_details ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.company_details ADD COLUMN IF NOT EXISTS signature_image_url TEXT;
ALTER TABLE public.company_details ADD COLUMN IF NOT EXISTS rbac_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.company_details ADD COLUMN IF NOT EXISTS admin_passkey TEXT;
ALTER TABLE public.company_details ADD COLUMN IF NOT EXISTS manager_passkey TEXT;
ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own company details" ON public.company_details;
CREATE POLICY "Users can manage their own company details" ON public.company_details FOR ALL
USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.company_details.user_id)
);

-- 5. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('company_assets', 'company_assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('pods', 'pods', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Assets" ON storage.objects;
CREATE POLICY "Public Assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'company_assets');
DROP POLICY IF EXISTS "Auth Uploads" ON storage.objects;
CREATE POLICY "Auth Uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('company_assets', 'pods'));

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload config';

-- ============================================================
-- VERIFY: After running, check these queries return rows:
-- SELECT * FROM public.vouchers LIMIT 1;
-- SELECT * FROM public.lorry_receipts LIMIT 1;
-- SELECT * FROM public.ledger_entries LIMIT 1;
-- ============================================================
