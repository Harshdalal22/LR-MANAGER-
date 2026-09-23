-- ============================================================
-- ACCOUNTING MODULE - SQL MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Extend ledger_entries with accounting fields
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS party_name text;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'manual';
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS category text;

-- 2. Create payment_receipts table
CREATE TABLE IF NOT EXISTS payment_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    date text NOT NULL,
    receipt_no text NOT NULL,
    party_name text NOT NULL,
    amount numeric NOT NULL DEFAULT 0,
    payment_mode text DEFAULT 'Cash',
    invoice_nos text[] DEFAULT '{}',
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 3. Enable Row Level Security on payment_receipts
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for payment_receipts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own payment_receipts') THEN
        CREATE POLICY "Users can view their own payment_receipts"
            ON payment_receipts FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own payment_receipts') THEN
        CREATE POLICY "Users can insert their own payment_receipts"
            ON payment_receipts FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own payment_receipts') THEN
        CREATE POLICY "Users can update their own payment_receipts"
            ON payment_receipts FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own payment_receipts') THEN
        CREATE POLICY "Users can delete their own payment_receipts"
            ON payment_receipts FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- 5. Index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_date ON payment_receipts(date);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_party ON payment_receipts(party_name);
