-- COMPLETE FIX: RLS Policies for drug_tests table
-- This script fixes the RLS blocking issue that requires service role fallback
-- Run this in Supabase SQL Editor
-- 
-- Based on table schema:
--   drug_tests.patient_id -> patients.user_id (foreign key)
--   For authenticated patients: patients.user_id = auth.uid()
--   Therefore: drug_tests.patient_id = auth.uid() should work

-- ============================================================================
-- STEP 1: Enable RLS on drug_tests table
-- ============================================================================
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop all existing policies to start fresh
-- ============================================================================
DROP POLICY IF EXISTS "Patients can view own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Patients can select own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Enable read access for patients" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can view all drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can create drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can update drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can delete drug tests" ON public.drug_tests;

-- ============================================================================
-- STEP 3: Create the SIMPLE policy for patients to view their own drug tests
-- This is the critical policy that's currently missing/not working
-- ============================================================================
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- Explanation:
-- - drug_tests.patient_id references patients.user_id (foreign key)
-- - For authenticated patients: patients.user_id = auth.uid()
-- - Therefore: drug_tests.patient_id = auth.uid() correctly identifies patient's own tests

-- ============================================================================
-- STEP 4: Create policy for staff to view all drug tests
-- ============================================================================
CREATE POLICY "Staff can view all drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.staff 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 5: Create policy for staff to create drug tests
-- ============================================================================
CREATE POLICY "Staff can create drug tests"
ON public.drug_tests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.staff 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 6: Create policy for staff to update drug tests
-- ============================================================================
CREATE POLICY "Staff can update drug tests"
ON public.drug_tests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.staff 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 7: Verify RLS is enabled
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'drug_tests' AND schemaname = 'public';

-- Expected: rls_enabled = true

-- ============================================================================
-- STEP 8: Verify all policies were created
-- ============================================================================
SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN cmd = 'SELECT' THEN '✓ Allows viewing'
    WHEN cmd = 'INSERT' THEN '✓ Allows creating'
    WHEN cmd = 'UPDATE' THEN '✓ Allows updating'
    WHEN cmd = 'DELETE' THEN '✓ Allows deleting'
    ELSE cmd
  END as description,
  qual as policy_condition
FROM pg_policies
WHERE tablename = 'drug_tests' AND schemaname = 'public'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END,
  policyname;

-- Expected result: You should see at least 4 policies:
-- 1. "Patients can view own drug tests" (SELECT) - patient_id = auth.uid()
-- 2. "Staff can view all drug tests" (SELECT) - staff check
-- 3. "Staff can create drug tests" (INSERT) - staff check
-- 4. "Staff can update drug tests" (UPDATE) - staff check

-- ============================================================================
-- STEP 9: Test the policy (optional - run as a patient user)
-- ============================================================================
-- This query should return drug tests for the authenticated patient:
-- SELECT * FROM public.drug_tests WHERE patient_id = auth.uid();

-- ============================================================================
-- STEP 10: Verify the foreign key relationship
-- ============================================================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'drug_tests'
  AND kcu.column_name = 'patient_id';

-- Expected: drug_tests.patient_id -> patients.user_id

-- ============================================================================
-- AFTER RUNNING THIS SCRIPT:
-- ============================================================================
-- 1. Refresh your browser and try accessing the drug test detail page again
-- 2. Check Vercel Function logs - you should NOT see "RLS BLOCKING DETECTED" anymore
-- 3. The API should work without needing service role fallback
-- 4. If you still see issues, check:
--    - That the authenticated user is actually a patient (exists in patients table)
--    - That patients.user_id matches the auth.uid()
--    - That the drug_tests.patient_id matches the patient's user_id

