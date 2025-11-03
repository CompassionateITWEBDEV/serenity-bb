-- FIX: Add RLS Policy for drug_tests table
-- This MUST be run to fix the "Drug test not found" error
-- Run this in Supabase SQL Editor

-- Step 1: Enable RLS on drug_tests table
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Patients can view own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can view all drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can create drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can update drug tests" ON public.drug_tests;

-- Step 3: Create policy for patients to view their own drug tests
-- This is the critical policy that's missing!
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (
  patient_id IN (
    SELECT user_id 
    FROM public.patients 
    WHERE user_id = auth.uid()
  )
);

-- Step 4: Create policy for staff to view all drug tests
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

-- Step 5: Create policy for staff to create drug tests
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

-- Step 6: Create policy for staff to update drug tests
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

-- Step 7: Verify policies were created
SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN cmd = 'SELECT' THEN '✓ Allows viewing'
    WHEN cmd = 'INSERT' THEN '✓ Allows creating'
    WHEN cmd = 'UPDATE' THEN '✓ Allows updating'
    ELSE cmd
  END as description
FROM pg_policies
WHERE tablename = 'drug_tests'
ORDER BY policyname;

-- You should see 4 policies:
-- 1. "Patients can view own drug tests" (SELECT)
-- 2. "Staff can create drug tests" (INSERT)
-- 3. "Staff can update drug tests" (UPDATE)
-- 4. "Staff can view all drug tests" (SELECT)

