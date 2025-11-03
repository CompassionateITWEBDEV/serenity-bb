-- Migration: Add metadata column to drug_tests table
-- Run this SQL to add the missing metadata column

-- Add metadata column if it doesn't exist
ALTER TABLE public.drug_tests 
ADD COLUMN IF NOT EXISTS metadata jsonb NULL DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSON queries on metadata
CREATE INDEX IF NOT EXISTS idx_drug_tests_metadata 
  ON public.drug_tests USING gin (metadata);

-- Update any existing rows to have empty metadata object
UPDATE public.drug_tests 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;

