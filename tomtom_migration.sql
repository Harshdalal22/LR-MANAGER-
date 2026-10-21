-- ============================================================
-- TomTom API Key Column Migration
-- Run this in: Supabase Dashboard ? SQL Editor
-- ============================================================

-- Add tomtom_api_key column to company_details table
ALTER TABLE public.company_details
ADD COLUMN IF NOT EXISTS tomtom_api_key TEXT;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'company_details'
  AND column_name = 'tomtom_api_key';
