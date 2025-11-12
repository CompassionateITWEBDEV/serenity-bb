-- ============================================
-- QUICK FIX FOR DRUG_TESTS RLS - RUN THIS NOW
-- ============================================
-- Copy this entire script and run it in Supabase SQL Editor
-- This will fix the RLS policies blocking drug test access

-- Step 1: Enable RLS
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
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
    END LOOP;
END $$;

-- Step 3: Create Policy 1 - Patients can view their own drug tests
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- Step 4: Create Policy 2 - Staff can view ALL drug tests
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

-- Step 5: Create Policy 3 - Staff can insert drug tests
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

-- Step 6: Create Policy 4 - Staff can update drug tests
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

-- Step 7: Verify policies were created
SELECT 
    policyname,
    cmd as operation,
    roles as applied_to
FROM pg_policies
WHERE tablename = 'drug_tests'
ORDER BY policyname;

-- ============================================
-- SUCCESS! You should see 4 policies listed above
-- Now refresh your browser and the drug test should load
-- ============================================








