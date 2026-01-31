-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO FIX SAVING ISSUES

-- 1. Add missing RBAC columns to the company_details table
-- This ensures the database can store the settings you are trying to save.
ALTER TABLE company_details ADD COLUMN IF NOT EXISTS rbac_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE company_details ADD COLUMN IF NOT EXISTS admin_passkey TEXT;
ALTER TABLE company_details ADD COLUMN IF NOT EXISTS manager_passkey TEXT;

-- 2. Verify RLS (Row Level Security) Policies
-- Ensures you have permission to update these new fields
DROP POLICY IF EXISTS "Users can update their own company details" ON company_details;
CREATE POLICY "Users can update their own company details" ON company_details
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own company details" ON company_details;
CREATE POLICY "Users can insert their own company details" ON company_details
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Force refresh checking
-- This doesn't change data but ensures schema cache is invalid
NOTIFY pgrst, 'reload schema';

-- OPTIONAL: If you want to force-enable RBAC for your user immediately, uncomment and run:
-- UPDATE company_details 
-- SET rbac_enabled = true, admin_passkey = 'admin123', manager_passkey = 'manager123' 
-- WHERE user_id = auth.uid();
