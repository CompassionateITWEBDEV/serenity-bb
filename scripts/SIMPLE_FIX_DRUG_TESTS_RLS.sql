-- SIMPLE FIX: Add RLS Policy for drug_tests table
-- This is the simplest and most direct policy
-- Run this in Supabase SQL Editor

-- Enable RLS
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Patients can view own drug tests" ON public.drug_tests;

-- SIMPLE POLICY: Patients can view drug tests where patient_id = auth.uid()
-- This works because drug_tests.patient_id references patients.user_id
-- and for authenticated patients, patients.user_id = auth.uid()
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual as policy_condition
FROM pg_policies
WHERE tablename = 'drug_tests' AND policyname = 'Patients can view own drug tests';

-- After running this, refresh your browser and try accessing the drug test detail page again

