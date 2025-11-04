-- SIMPLE FIX: Add RLS Policy for drug_tests table
-- This is the simplest and most direct policy
-- Run this in Supabase SQL Editor
-- 
-- This fixes the issue where patients cannot see their own drug tests
-- The API logs show: "RLS BLOCKING DETECTED" and "RLS WORKAROUND ACTIVE"
-- After running this, the service role fallback will no longer be needed

-- Step 1: Enable RLS (if not already enabled)
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Patients can view own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Patients can select own drug tests" ON public.drug_tests;

-- Step 3: Create the policy that allows patients to view their own drug tests
-- CRITICAL: This policy uses USING (patient_id = auth.uid())
-- This works because:
--   - drug_tests.patient_id references patients.user_id
--   - For authenticated patients, patients.user_id = auth.uid()
--   - So we check: patient_id = auth.uid()
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
USING (patient_id = auth.uid());

-- Step 4: Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual as policy_condition,
  CASE 
    WHEN qual LIKE '%patient_id%' AND qual LIKE '%auth.uid()%' THEN '✅ Policy looks correct'
    ELSE '⚠️ Policy may need review'
  END as verification
FROM pg_policies
WHERE tablename = 'drug_tests' AND policyname = 'Patients can view own drug tests';

-- Step 5: Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS is enabled'
    ELSE '❌ RLS is NOT enabled - run ALTER TABLE drug_tests ENABLE ROW LEVEL SECURITY'
  END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'drug_tests';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- After running this script:
-- 1. ✅ RLS will be enabled on drug_tests table
-- 2. ✅ Patients can view their own drug tests (where patient_id = auth.uid())
-- 3. ✅ The API route will no longer need service role fallback
-- 4. ✅ Check Vercel Function logs - "RLS BLOCKING DETECTED" warnings should stop
--
-- Test by:
-- 1. Refresh your browser on the drug test detail page
-- 2. Check Vercel Function logs - you should see "Successfully fetched drug test" without RLS bypass warnings

