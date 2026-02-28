-- Run this script in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.manager_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_email TEXT NOT NULL,
    manager_name TEXT NOT NULL,
    manager_email TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    session_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.manager_access_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert a request (since managers are not logged in yet)
DROP POLICY IF EXISTS "Allow public inserts on requests" ON public.manager_access_requests;
CREATE POLICY "Allow public inserts on requests" 
ON public.manager_access_requests FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow anyone to read requests (so manager can listen for approval, and Admin can read)
DROP POLICY IF EXISTS "Allow public selects on requests" ON public.manager_access_requests;
CREATE POLICY "Allow public selects on requests" 
ON public.manager_access_requests FOR SELECT 
TO public 
USING (true);

-- Allow anyone to update requests (so Admin can approve)
DROP POLICY IF EXISTS "Allow public updates on requests" ON public.manager_access_requests;
CREATE POLICY "Allow public updates on requests" 
ON public.manager_access_requests FOR UPDATE 
TO public 
USING (true);

-- Allow anyone to delete requests (cleanup)
DROP POLICY IF EXISTS "Allow public deletes on requests" ON public.manager_access_requests;
CREATE POLICY "Allow public deletes on requests" 
ON public.manager_access_requests FOR DELETE 
TO public 
USING (true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';

-- Enable Realtime for this table so Manager logins are instant
ALTER PUBLICATION supabase_realtime ADD TABLE public.manager_access_requests;
