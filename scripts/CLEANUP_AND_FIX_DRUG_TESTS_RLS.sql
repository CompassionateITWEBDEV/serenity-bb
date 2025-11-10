-- CLEANUP AND FIX: Drug Tests RLS Policies
-- This script cleans up all existing policies and creates clean, working ones
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Enable RLS
-- ============================================
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: Drop ALL existing policies (cleanup)
-- ============================================
-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Patients can view own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Patients can select own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Enable read access for patients" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can view all drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can insert drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can update drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "allow_staff_insert" ON public.drug_tests;
DROP POLICY IF EXISTS "allow_staff_read" ON public.drug_tests;
DROP POLICY IF EXISTS "allow_staff_update" ON public.drug_tests;
DROP POLICY IF EXISTS "patient_select_own_tests" ON public.drug_tests;
DROP POLICY IF EXISTS "staff create drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "staff read drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "staff update drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "staff_insert_own_drug_test" ON public.drug_tests;
DROP POLICY IF EXISTS "staff_select_own_created_tests" ON public.drug_tests;
DROP POLICY IF EXISTS "staff_update_own_created_tests" ON public.drug_tests;

-- Drop any other policies that might exist (catch-all)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'drug_tests') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.drug_tests', r.policyname);
    END LOOP;
END $$;

-- ============================================
-- PART 3: Create CLEAN, SIMPLE Policies
-- ============================================

-- Policy 1: Patients can view their own drug tests
-- This is the critical policy for patients
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
USING (
  -- The authenticated user's ID matches the patient_id
  patient_id = auth.uid()
);

-- Policy 2: Staff can view ALL drug tests
-- This allows staff to see all drug tests for management
CREATE POLICY "Staff can view all drug tests"
ON public.drug_tests
FOR SELECT
USING (
  -- Check if the authenticated user is an active staff member
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
    AND staff.active = true
  )
);

-- Policy 3: Staff can insert drug tests
CREATE POLICY "Staff can insert drug tests"
ON public.drug_tests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
    AND staff.active = true
  )
);

-- Policy 4: Staff can update drug tests
CREATE POLICY "Staff can update drug tests"
ON public.drug_tests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
    AND staff.active = true
  )
);

-- ============================================
-- PART 4: Verification
-- ============================================

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS is enabled'
    ELSE '❌ RLS is NOT enabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'drug_tests';

-- List all policies (should only show 4 clean policies)
SELECT 
  policyname,
  cmd,
  qual as policy_condition,
  CASE 
    WHEN policyname = 'Patients can view own drug tests' 
         AND qual LIKE '%patient_id%' 
         AND qual LIKE '%auth.uid()%' 
      THEN '✅ Correct - Patients can view own tests'
    WHEN policyname = 'Staff can view all drug tests' 
         AND qual LIKE '%staff%' 
         AND qual LIKE '%auth.uid()%' 
      THEN '✅ Correct - Staff can view all tests'
    WHEN policyname = 'Staff can insert drug tests' 
         AND cmd = 'INSERT'
      THEN '✅ Correct - Staff can create tests'
    WHEN policyname = 'Staff can update drug tests' 
         AND cmd = 'UPDATE'
      THEN '✅ Correct - Staff can update tests'
    ELSE '⚠️ Review needed'
  END as verification
FROM pg_policies
WHERE tablename = 'drug_tests'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    ELSE 4
  END,
  policyname;

-- Count policies (should be exactly 4)
SELECT 
  COUNT(*) as total_policies,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ Correct number of policies'
    ELSE '⚠️ Expected 4 policies, found ' || COUNT(*)::text
  END as status
FROM pg_policies
WHERE tablename = 'drug_tests';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Drug tests RLS policies cleaned up and fixed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created policies:';
  RAISE NOTICE '1. ✅ Patients can view own drug tests (SELECT)';
  RAISE NOTICE '2. ✅ Staff can view all drug tests (SELECT)';
  RAISE NOTICE '3. ✅ Staff can insert drug tests (INSERT)';
  RAISE NOTICE '4. ✅ Staff can update drug tests (UPDATE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh staff dashboard - drug tests should appear';
  RAISE NOTICE '2. Test as patient - should only see own tests';
  RAISE NOTICE '3. Test as staff - should see all tests';
END $$;





