-- SIMPLE FIX: Add RLS Policy for drug_tests table
-- This is the simplest and most direct policy
-- Run this in Supabase SQL Editor
--
-- Based on table schema:
--   CREATE TABLE drug_tests (
--     patient_id uuid NOT NULL,
--     CONSTRAINT drug_tests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(user_id)
--   )
--
-- For authenticated patients:
--   patients.user_id = auth.uid()
--   drug_tests.patient_id = patients.user_id
--   Therefore: drug_tests.patient_id = auth.uid() ✓

-- ============================================================================
-- STEP 1: Enable RLS
-- ============================================================================
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop existing policies to avoid conflicts
-- ============================================================================
DROP POLICY IF EXISTS "Patients can view own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Patients can select own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Enable read access for patients" ON public.drug_tests;

-- ============================================================================
-- STEP 3: Create the SIMPLE policy
-- ============================================================================
-- SIMPLE POLICY: Patients can view drug tests where patient_id = auth.uid()
-- This works because:
--   - drug_tests.patient_id references patients.user_id (foreign key)
--   - For authenticated patients: patients.user_id = auth.uid()
--   - Therefore: drug_tests.patient_id = auth.uid() correctly matches
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- ============================================================================
-- STEP 4: Verify the policy was created
-- ============================================================================
SELECT 
  policyname,
  cmd,
  qual as policy_condition,
  CASE 
    WHEN qual = '(patient_id = auth.uid())' THEN '✓ Policy is correct'
    ELSE '⚠ Policy condition may be different'
  END as verification
FROM pg_policies
WHERE tablename = 'drug_tests' 
  AND schemaname = 'public'
  AND policyname = 'Patients can view own drug tests';

-- ============================================================================
-- STEP 5: Verify RLS is enabled
-- ============================================================================
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'drug_tests' AND schemaname = 'public';

-- Expected: rls_enabled = true

-- ============================================================================
-- AFTER RUNNING THIS SCRIPT:
-- ============================================================================
-- 1. Refresh your browser and try accessing the drug test detail page again
-- 2. Check Vercel Function logs - you should NOT see "RLS BLOCKING DETECTED"
-- 3. The API should work without needing service role fallback
--
-- If you still see RLS blocking:
-- - Verify the authenticated user exists in patients table
-- - Verify patients.user_id = auth.uid()
-- - Verify drug_tests.patient_id matches the patient's user_id
-- - Check that the policy condition is exactly: patient_id = auth.uid()

