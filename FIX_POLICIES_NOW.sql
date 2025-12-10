-- URGENT FIX - Policies exist but aren't working
-- Run this RIGHT NOW in Supabase SQL Editor

-- Step 1: Check current policy conditions
SELECT 
    policyname,
    cmd,
    qual as policy_condition,
    with_check as policy_with_check
FROM pg_policies
WHERE tablename = 'drug_tests';

-- Step 2: Drop ALL policies
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'drug_tests') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.drug_tests', r.policyname);
    END LOOP;
END $$;

-- Step 3: Recreate with EXACT correct conditions
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "Staff can view all drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can insert drug tests"
ON public.drug_tests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
  )
);

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

-- Step 4: Verify the policies were created correctly
SELECT 
    policyname,
    cmd,
    qual as policy_condition
FROM pg_policies
WHERE tablename = 'drug_tests'
ORDER BY policyname;

-- DONE! Refresh your browser now.



















