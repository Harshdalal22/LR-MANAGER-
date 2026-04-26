-- ================================================================================
-- OPERATOR ACCESS SCRIPT
-- Run this in your Supabase SQL Editor.
-- It creates the operator table, and updates RLS rules for shared access.
-- ================================================================================

CREATE TABLE IF NOT EXISTS public.app_users (
    operator_id UUID PRIMARY KEY,
    admin_id UUID NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'Operator',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Admins can insert/view/delete their own operators
DROP POLICY IF EXISTS "Admins can manage their operators" ON public.app_users;
CREATE POLICY "Admins can manage their operators" ON public.app_users
FOR ALL USING (auth.uid() = admin_id);

-- Operators can read their own row (to check their role/admin)
DROP POLICY IF EXISTS "Operators can view own mapping" ON public.app_users;
CREATE POLICY "Operators can view own mapping" ON public.app_users
FOR SELECT USING (auth.uid() = operator_id);

-- Wait, when we create an operator from the client app using a secondary client (anon key), 
-- the current user is NOT the admin inside the secondary client! The secondary client is unauthorized before signUp.
-- After signUp, the secondary client becomes the operator.
-- Then the primary client (Admin) must issue the INSERT.
-- So we need to make sure the Admin client can insert the new operator ID.
-- This matches "Admins can manage their operators" because the main client has auth.uid() = admin_id.

-- ==============================================================================
-- UPDATE RLS POLICIES ON MAIN TABLES
-- Allow both the Admin (auth.uid() = user_id) 
-- OR the Operator (auth.uid() = operator_id WHERE admin_id = user_id)
-- ==============================================================================

-- 1. Lorry Receipts
DROP POLICY IF EXISTS "Users can manage their own LRs" ON public.lorry_receipts;
CREATE POLICY "Users can manage their own LRs" ON public.lorry_receipts FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = lorry_receipts.user_id)
);

-- 2. Company Details
DROP POLICY IF EXISTS "Users can manage their own company details" ON public.company_details;
CREATE POLICY "Users can manage their own company details" ON public.company_details FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = company_details.user_id)
);

-- 3. Saved Parties
DROP POLICY IF EXISTS "Users can manage their own saved parties" ON public.saved_parties;
CREATE POLICY "Users can manage their own saved parties" ON public.saved_parties FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = saved_parties.user_id)
);

-- 4. Saved Trucks
DROP POLICY IF EXISTS "Users can manage their own saved trucks" ON public.saved_trucks;
CREATE POLICY "Users can manage their own saved trucks" ON public.saved_trucks FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = saved_trucks.user_id)
);

-- 5. Vehicle Hirings
DROP POLICY IF EXISTS "Users can manage their own vehicle hirings" ON public.vehicle_hirings;
CREATE POLICY "Users can manage their own vehicle hirings" ON public.vehicle_hirings FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = vehicle_hirings.user_id)
);

-- 6. Booking Registers
DROP POLICY IF EXISTS "Users can manage their own booking records" ON public.booking_registers;
CREATE POLICY "Users can manage their own booking records" ON public.booking_registers FOR ALL
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = booking_registers.user_id)
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
