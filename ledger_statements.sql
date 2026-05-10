
-- Table to store saved ledger statements
CREATE TABLE IF NOT EXISTS public.ledger_statements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID NOT NULL,
    party_name TEXT NOT NULL,
    from_date DATE,
    to_date DATE,
    file_path TEXT NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ledger_statements ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage their own statements" ON public.ledger_statements;
CREATE POLICY "Users can manage their own statements" ON public.ledger_statements FOR ALL
USING (
    auth.uid() = admin_id 
    OR 
    EXISTS (
        SELECT 1 FROM app_users 
        WHERE app_users.operator_id = auth.uid() 
        AND app_users.admin_id = ledger_statements.admin_id
    )
);

-- Create storage bucket policy (if bucket exists)
-- This is handled by the generic storage policies we added earlier, 
-- but let's ensure we have a 'statements' bucket.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('statements', 'statements', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Give users access to statements insert" ON storage.objects;
CREATE POLICY "Give users access to statements insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'statements');

DROP POLICY IF EXISTS "Give users access to statements select" ON storage.objects;
CREATE POLICY "Give users access to statements select" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'statements');
