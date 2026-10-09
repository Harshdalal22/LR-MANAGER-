-- =====================================================================
-- 🚚 TRUCK GARAGE & FLEET MANAGEMENT DATABASE MIGRATION SCRIPT
-- =====================================================================
-- Copy and run this script in your Supabase SQL Editor.
-- It extends public.saved_trucks with all CRED Garage & Compliance fields.
-- =====================================================================

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.saved_trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    "truckNo" TEXT NOT NULL,
    "ownerName" TEXT,
    "contactNumber" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add Extended CRED Garage & Fleet Management Columns
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS make TEXT DEFAULT 'Tata Motors';
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS truck_type TEXT DEFAULT '16 Wheeler Container';
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS capacity TEXT;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'White';
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS driver_contact TEXT;

-- Compliance & Document Expiries
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS insurance_policy_no TEXT;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS insurance_provider TEXT;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS pollution_expiry DATE;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS fitness_expiry DATE;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS national_permit_expiry DATE;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS road_tax_expiry DATE;

-- FASTag, Challans & Finance
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS fastag_balance NUMERIC DEFAULT 0;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS fastag_bank TEXT;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS challan_count INTEGER DEFAULT 0;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS challan_amount NUMERIC DEFAULT 0;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS emi_amount NUMERIC DEFAULT 0;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS emi_due_day INTEGER;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS financer_name TEXT;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.saved_trucks ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}'::jsonb;

-- 3. Row Level Security (RLS)
ALTER TABLE public.saved_trucks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own saved trucks" ON public.saved_trucks;
CREATE POLICY "Users can manage their own saved trucks" ON public.saved_trucks FOR ALL
USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.saved_trucks.user_id)
);

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
