-- Run this script in the Supabase SQL Editor
-- This allows Admins to easily change the email and password of their Operators

-- Ensure pgcrypto is installed in the extensions schema (Supabase default)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION update_operator_auth(
  p_operator_id uuid,
  p_new_email text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- 1. Verify the caller is the admin of this operator
  SELECT admin_id INTO v_admin_id 
  FROM app_users 
  WHERE operator_id = p_operator_id;

  IF v_admin_id IS NULL OR v_admin_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to modify this operator';
  END IF;

  -- 2. Update auth.users
  -- We use extensions.crypt and extensions.gen_salt because Supabase installs extensions in the "extensions" schema.
  IF p_new_email IS NOT NULL AND p_new_email != '' THEN
    UPDATE auth.users 
    SET 
      email = p_new_email,
      encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
    WHERE id = p_operator_id;
    
    -- Also update app_users table email
    UPDATE app_users
    SET email = p_new_email
    WHERE operator_id = p_operator_id;
  ELSE
    UPDATE auth.users 
    SET 
      encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
    WHERE id = p_operator_id;
  END IF;

  RETURN true;
END;
$$;
