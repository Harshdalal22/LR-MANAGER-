-- === STEP 1: ADD/FIX COLUMNS & CONSTRAINTS ===

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

-- Ensure lrNo is unique for correct upsert operations
ALTER TABLE public.lorry_receipts DROP CONSTRAINT IF EXISTS "lorry_receipts_lrNo_key";
ALTER TABLE public.lorry_receipts ADD CONSTRAINT "lorry_receipts_lrNo_key" UNIQUE ("lrNo");

ALTER TABLE public.lorry_receipts ALTER COLUMN "invoiceDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "poDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "ewayBillDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "ewayExDate" DROP NOT NULL;

-- === STEP 2: APPLY ROW LEVEL SECURITY (RLS) POLICIES ===

-- lorry_receipts
ALTER TABLE public.lorry_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own LRs" ON public.lorry_receipts;
CREATE POLICY "Users can manage their own LRs" ON public.lorry_receipts FOR ALL
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.lorry_receipts.user_id)
);

-- company_details
ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own company details" ON public.company_details;
CREATE POLICY "Users can manage their own company details" ON public.company_details FOR ALL
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.company_details.user_id)
);

-- saved_parties
ALTER TABLE public.saved_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own saved parties" ON public.saved_parties;
CREATE POLICY "Users can manage their own saved parties" ON public.saved_parties FOR ALL
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.saved_parties.user_id)
);

-- saved_trucks
ALTER TABLE public.saved_trucks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own saved trucks" ON public.saved_trucks;
CREATE POLICY "Users can manage their own saved trucks" ON public.saved_trucks FOR ALL
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.saved_trucks.user_id)
);

-- vehicle_hirings
ALTER TABLE public.vehicle_hirings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own vehicle hirings" ON public.vehicle_hirings;
CREATE POLICY "Users can manage their own vehicle hirings" ON public.vehicle_hirings FOR ALL
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.vehicle_hirings.user_id)
);

-- booking_registers
ALTER TABLE public.booking_registers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own booking records" ON public.booking_registers;
CREATE POLICY "Users can manage their own booking records" ON public.booking_registers FOR ALL
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.booking_registers.user_id)
);

-- === STEP 3: REFRESH SCHEMA CACHE ===
NOTIFY pgrst, 'reload config';

-- === STEP 4: ADD MISSING ASSET COLUMNS ===
ALTER TABLE public.company_details ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.company_details ADD COLUMN IF NOT EXISTS signature_image_url TEXT;

-- === STEP 5: CREATE STORAGE BUCKETS ===
INSERT INTO storage.buckets (id, name, public) VALUES ('company_assets', 'company_assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('pods', 'pods', true) ON CONFLICT (id) DO NOTHING;

-- === STEP 6: STORAGE POLICIES ===
DROP POLICY IF EXISTS "Public Assets" ON storage.objects;
CREATE POLICY "Public Assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'company_assets');

DROP POLICY IF EXISTS "Auth Uploads" ON storage.objects;
CREATE POLICY "Auth Uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('company_assets', 'pods'));

-- === STEP 7: UPDATE GPS INVOICES TABLE ===
ALTER TABLE public.gps_invoices ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.gps_invoices ADD COLUMN IF NOT EXISTS customer_gst TEXT;
ALTER TABLE public.gps_invoices ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE public.gps_invoices ADD COLUMN IF NOT EXISTS quantity NUMERIC;
ALTER TABLE public.gps_invoices ADD COLUMN IF NOT EXISTS rate NUMERIC;
ALTER TABLE public.gps_invoices ADD COLUMN IF NOT EXISTS tax_rate NUMERIC;
ALTER TABLE public.gps_invoices ADD COLUMN IF NOT EXISTS cgst NUMERIC;
ALTER TABLE public.gps_invoices ADD COLUMN IF NOT EXISTS sgst NUMERIC;
ALTER TABLE public.gps_invoices ADD COLUMN IF NOT EXISTS igst NUMERIC;

-- Ensure RLS is enabled and policies exist for GPS invoices
ALTER TABLE public.gps_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own GPS invoices" ON public.gps_invoices;
CREATE POLICY "Users can manage their own GPS invoices" ON public.gps_invoices FOR ALL
USING (auth.uid() = user_id);

-- Refresh schema cache again
NOTIFY pgrst, 'reload config';
