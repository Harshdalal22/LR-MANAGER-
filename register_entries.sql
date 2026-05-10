-- Create register_entries table
CREATE TABLE IF NOT EXISTS public.register_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID NOT NULL,
    month TEXT,
    gr_no TEXT,
    lrc_no TEXT,
    bill_no TEXT,
    date TEXT,
    vehicle_no TEXT,
    contact_no TEXT,
    owner_name TEXT,
    ref_tpt TEXT,
    from_loc TEXT,
    to_loc TEXT,
    driver_fare NUMERIC,
    driver_advance NUMERIC,
    pod_status TEXT,
    driver_payment_status TEXT,
    note TEXT,
    driver_balance NUMERIC,
    actual_balance NUMERIC,
    party_tpt TEXT,
    party_fare NUMERIC,
    party_advance NUMERIC,
    party_balance NUMERIC,
    other_exp NUMERIC,
    party_total_balance NUMERIC,
    party_payment_status TEXT,
    commission NUMERIC,
    difference NUMERIC,
    total NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.register_entries ENABLE ROW LEVEL SECURITY;

-- Allow access for Admin or Operator linked to the admin
CREATE POLICY "Users can access register entries" ON public.register_entries 
FOR ALL 
USING (
    auth.uid() = admin_id 
    OR 
    EXISTS (
        SELECT 1 FROM operator_links 
        WHERE operator_links.operator_id = auth.uid() 
        AND operator_links.admin_id = register_entries.admin_id
    )
);
