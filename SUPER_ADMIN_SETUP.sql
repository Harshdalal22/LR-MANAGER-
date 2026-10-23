-- ================================================================================
-- SUPER ADMIN POWERHOUSE SETUP FOR admin@ssk.com
-- ================================================================================
-- Run this script in your Supabase SQL Editor.
-- This grants admin@ssk.com FULL UNRESTRICTED BYPASS access across ALL tables,
-- allowing the Super Admin to view, create, edit, or delete ANY record of ANY user.
-- ================================================================================

-- Helper function to check if caller is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (auth.jwt() ->> 'email') = 'admin@ssk.com';
$$;

-- 1. LORRY RECEIPTS: Allow super admin full access
DROP POLICY IF EXISTS "Super admin full access on lorry_receipts" ON public.lorry_receipts;
CREATE POLICY "Super admin full access on lorry_receipts" ON public.lorry_receipts
FOR ALL
USING (
  public.is_super_admin()
  OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.lorry_receipts.user_id)
);

-- 2. SAVED PARTIES: Allow super admin full access
DROP POLICY IF EXISTS "Super admin full access on saved_parties" ON public.saved_parties;
CREATE POLICY "Super admin full access on saved_parties" ON public.saved_parties
FOR ALL
USING (
  public.is_super_admin()
  OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.saved_parties.user_id)
);

-- 3. SAVED TRUCKS: Allow super admin full access
DROP POLICY IF EXISTS "Super admin full access on saved_trucks" ON public.saved_trucks;
CREATE POLICY "Super admin full access on saved_trucks" ON public.saved_trucks
FOR ALL
USING (
  public.is_super_admin()
  OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.saved_trucks.user_id)
);

-- 4. VOUCHERS: Allow super admin full access
DROP POLICY IF EXISTS "Super admin full access on vouchers" ON public.vouchers;
CREATE POLICY "Super admin full access on vouchers" ON public.vouchers
FOR ALL
USING (
  public.is_super_admin()
  OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.vouchers.user_id)
);

-- 5. LEDGER ENTRIES: Allow super admin full access
DROP POLICY IF EXISTS "Super admin full access on ledger_entries" ON public.ledger_entries;
CREATE POLICY "Super admin full access on ledger_entries" ON public.ledger_entries
FOR ALL
USING (
  public.is_super_admin()
  OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.ledger_entries.user_id)
);

-- 6. APP USERS: Allow super admin to view and manage ALL accounts
DROP POLICY IF EXISTS "Super admin full access on app_users" ON public.app_users;
CREATE POLICY "Super admin full access on app_users" ON public.app_users
FOR ALL
USING (
  public.is_super_admin()
  OR auth.uid() = admin_id
  OR auth.uid() = operator_id
);

-- 7. COMPANY DETAILS: Allow super admin full access
DROP POLICY IF EXISTS "Super admin full access on company_details" ON public.company_details;
CREATE POLICY "Super admin full access on company_details" ON public.company_details
FOR ALL
USING (
  public.is_super_admin()
  OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.app_users WHERE operator_id = auth.uid() AND admin_id = public.company_details.user_id)
);

-- 8. VEHICLE HIRINGS: Allow super admin full access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_hirings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Super admin full access on vehicle_hirings" ON public.vehicle_hirings';
    EXECUTE 'CREATE POLICY "Super admin full access on vehicle_hirings" ON public.vehicle_hirings FOR ALL USING (public.is_super_admin() OR auth.uid() = user_id)';
  END IF;
END $$;

-- 9. BOOKING REGISTERS: Allow super admin full access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_registers') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Super admin full access on booking_registers" ON public.booking_registers';
    EXECUTE 'CREATE POLICY "Super admin full access on booking_registers" ON public.booking_registers FOR ALL USING (public.is_super_admin() OR auth.uid() = user_id)';
  END IF;
END $$;

-- 10. RPC function to list all registered users for admin@ssk.com
CREATE OR REPLACE FUNCTION public.get_all_system_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  total_lrs bigint,
  total_trucks bigint,
  total_parties bigint,
  total_vouchers bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only admin@ssk.com can invoke get_all_system_users()';
  END IF;

  RETURN QUERY
  SELECT 
    au.id AS user_id,
    au.email::text,
    COALESCE(ap.role, 'Admin')::text AS role,
    au.created_at,
    (SELECT count(*) FROM public.lorry_receipts lr WHERE lr.user_id = au.id) AS total_lrs,
    (SELECT count(*) FROM public.saved_trucks st WHERE st.user_id = au.id) AS total_trucks,
    (SELECT count(*) FROM public.saved_parties sp WHERE sp.user_id = au.id) AS total_parties,
    (SELECT count(*) FROM public.vouchers v WHERE v.user_id = au.id) AS total_vouchers
  FROM auth.users au
  LEFT JOIN public.app_users ap ON ap.operator_id = au.id
  ORDER BY au.created_at DESC;
END;
$$;

-- 11. RPC function to allow admin@ssk.com to update ANY user's password directly
CREATE OR REPLACE FUNCTION public.admin_set_user_password(target_user_id uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only admin@ssk.com can update user passwords';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN true;
END;
$$;

-- 12. RPC function to allow admin@ssk.com to delete ANY user completely
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only admin@ssk.com can delete users';
  END IF;

  DELETE FROM public.app_users WHERE operator_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN true;
END;
$$;
