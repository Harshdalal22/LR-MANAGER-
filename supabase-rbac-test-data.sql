-- =====================================================
-- RBAC Test Data Setup - CORRECTED VERSION
-- =====================================================

-- STEP 1: Find your user_id
-- Run this query first to get your actual user_id:

SELECT user_id, company_name, email 
FROM company_details 
ORDER BY created_at DESC 
LIMIT 5;

-- Copy the user_id from the results above, then use it in STEP 2


-- =====================================================
-- STEP 2: Enable RBAC with test passkeys
-- =====================================================
-- Replace 'paste-your-user-id-here' with the actual UUID from STEP 1

UPDATE company_details 
SET rbac_enabled = true,
    admin_passkey = 'admin123',
    manager_passkey = 'manager123'
WHERE user_id = 'paste-your-user-id-here';

-- Example (your UUID will look different):
-- UPDATE company_details 
-- SET rbac_enabled = true,
--     admin_passkey = 'admin123',
--     manager_passkey = 'manager123'
-- WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';


-- =====================================================
-- ALTERNATIVE: Update for ALL users (if you only have one account)
-- =====================================================
-- If you only have one company/user, you can use this instead:

UPDATE company_details 
SET rbac_enabled = true,
    admin_passkey = 'admin123',
    manager_passkey = 'manager123';


-- =====================================================
-- STEP 3: Verify the update
-- =====================================================
-- Run this to confirm RBAC is enabled:

SELECT 
    user_id,
    company_name,
    rbac_enabled,
    CASE 
        WHEN admin_passkey IS NOT NULL THEN '✓ Set' 
        ELSE '✗ Not Set' 
    END as admin_passkey_status,
    CASE 
        WHEN manager_passkey IS NOT NULL THEN '✓ Set' 
        ELSE '✗ Not Set' 
    END as manager_passkey_status
FROM company_details;


-- =====================================================
-- Quick Enable for Current Session User
-- =====================================================
-- This will enable RBAC for the currently logged-in user:

UPDATE company_details 
SET rbac_enabled = true,
    admin_passkey = 'admin123',
    manager_passkey = 'manager123'
WHERE user_id = auth.uid();


-- =====================================================
-- RECOMMENDED APPROACH
-- =====================================================
-- Instead of using SQL, you can also:
-- 1. Login to your app
-- 2. Go to Settings (click the gear icon)
-- 3. Scroll to "Role Management (RBAC)"
-- 4. Toggle "Enable Role System"
-- 5. Enter your desired Admin Passkey
-- 6. Enter your desired Manager Passkey
-- 7. Click Save
-- 
-- This is the safest and easiest method!
