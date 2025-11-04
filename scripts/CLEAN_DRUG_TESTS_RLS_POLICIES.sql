-- ============================================
-- CLEAN UP DRUG_TESTS RLS POLICIES
-- This script removes ALL existing policies and creates clean ones
-- Run this in Supabase SQL Editor to fix the policy conflicts
-- ============================================

-- Step 1: Enable RLS (if not already enabled)
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to start fresh
-- This removes all the duplicate and conflicting policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'drug_tests'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.drug_tests', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 3: Verify all policies are dropped
SELECT 
    'Policies remaining (should be 0):' as status,
    COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'drug_tests';

-- ============================================
-- Step 4: Create CLEAN, SIMPLE Policies
-- ============================================

-- Policy 1: Patients can view their own drug tests
-- This is the critical policy for patients
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (
  -- The authenticated user's ID matches the patient_id
  patient_id = auth.uid()
);

-- Policy 2: Staff can view ALL drug tests
-- This allows staff to see all drug tests for management
CREATE POLICY "Staff can view all drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (
  -- Check if the authenticated user is a staff member
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
  )
);

-- Policy 3: Staff can create/insert drug tests
CREATE POLICY "Staff can create drug tests"
ON public.drug_tests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
  )
);

-- Policy 4: Staff can update drug tests
CREATE POLICY "Staff can update drug tests"
ON public.drug_tests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
  )
);

-- ============================================
-- Step 5: Verification
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
  cmd as operation,
  roles as applied_to,
  qual as policy_condition,
  CASE 
    WHEN policyname = 'Patients can view own drug tests' AND qual LIKE '%patient_id%' AND qual LIKE '%auth.uid()%' THEN '✅ Correct'
    WHEN policyname = 'Staff can view all drug tests' AND qual LIKE '%staff%' AND qual LIKE '%auth.uid()%' THEN '✅ Correct'
    WHEN policyname = 'Staff can create drug tests' AND qual LIKE '%staff%' AND qual LIKE '%auth.uid()%' THEN '✅ Correct'
    WHEN policyname = 'Staff can update drug tests' AND qual LIKE '%staff%' AND qual LIKE '%auth.uid()%' THEN '✅ Correct'
    ELSE '⚠️ Review needed'
  END as verification
FROM pg_policies
WHERE tablename = 'drug_tests'
ORDER BY policyname;

-- ============================================
-- SUCCESS CHECKLIST
-- ============================================
-- After running this script, you should see:
-- ✅ Only 4 policies (not 14!)
-- ✅ RLS enabled
-- ✅ All policies have correct conditions
-- ✅ No duplicate policies
--
-- The 4 policies should be:
-- 1. Patients can view own drug tests (SELECT, authenticated, patient_id = auth.uid())
-- 2. Staff can view all drug tests (SELECT, authenticated, staff check)
-- 3. Staff can create drug tests (INSERT, authenticated, staff check)
-- 4. Staff can update drug tests (UPDATE, authenticated, staff check)

