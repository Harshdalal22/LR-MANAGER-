-- =====================================================
-- RBAC (Role-Based Access Control) Migration
-- =====================================================
-- This SQL script adds the necessary columns to support
-- RBAC with separate Admin and Manager passkeys
-- =====================================================

-- Add RBAC columns to company_details table
-- Run this in your Supabase SQL Editor

ALTER TABLE company_details 
ADD COLUMN IF NOT EXISTS rbac_enabled BOOLEAN DEFAULT false;

ALTER TABLE company_details 
ADD COLUMN IF NOT EXISTS admin_passkey TEXT;

ALTER TABLE company_details 
ADD COLUMN IF NOT EXISTS manager_passkey TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN company_details.rbac_enabled IS 'Enable role-based access control system';
COMMENT ON COLUMN company_details.admin_passkey IS 'Passkey for Admin role login and switching';
COMMENT ON COLUMN company_details.manager_passkey IS 'Passkey for Manager role login';

-- Optional: Create an index for faster RBAC checks
CREATE INDEX IF NOT EXISTS idx_company_details_rbac 
ON company_details(rbac_enabled) 
WHERE rbac_enabled = true;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the columns were added successfully:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'company_details' 
-- AND column_name IN ('rbac_enabled', 'admin_passkey', 'manager_passkey');

-- =====================================================
-- Sample Data Update (Optional)
-- =====================================================
-- If you want to enable RBAC for testing, uncomment and run:
-- UPDATE company_details 
-- SET rbac_enabled = true,
--     admin_passkey = 'admin123',
--     manager_passkey = 'manager123'
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- =====================================================
-- Rollback (if needed)
-- =====================================================
-- If you need to remove these columns, uncomment and run:
-- ALTER TABLE company_details DROP COLUMN IF EXISTS rbac_enabled;
-- ALTER TABLE company_details DROP COLUMN IF EXISTS admin_passkey;
-- ALTER TABLE company_details DROP COLUMN IF EXISTS manager_passkey;
