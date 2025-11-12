-- COMPLETE DIAGNOSTIC AND FIX SCRIPT
-- Run this in Supabase SQL Editor to see what's wrong and fix it

-- STEP 1: Check current policies
SELECT 
    policyname,
    cmd as operation,
    qual as policy_condition,
    with_check as policy_with_check
FROM pg_policies
WHERE tablename = 'drug_tests'
ORDER BY policyname;

-- STEP 2: Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'drug_tests';

-- STEP 3: Verify the drug test exists and check patient_id
SELECT 
    id,
    patient_id,
    status,
    created_at
FROM drug_tests
WHERE id = 'c52b0e58-bf1a-4d34-af5b-dd635200592b';

-- STEP 4: Check if patient_id matches a user_id in patients table
SELECT 
    dt.id as drug_test_id,
    dt.patient_id,
    p.user_id as patient_user_id,
    CASE 
        WHEN dt.patient_id = p.user_id THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as match_status
FROM drug_tests dt
LEFT JOIN patients p ON dt.patient_id = p.user_id
WHERE dt.id = 'c52b0e58-bf1a-4d34-af5b-dd635200592b';

-- STEP 5: Drop ALL existing policies
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'drug_tests') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.drug_tests', r.policyname);
        RAISE NOTICE 'Dropped: %', r.policyname;
    END LOOP;
END $$;

-- STEP 6: Enable RLS
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create patient policy with SIMPLE condition
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- STEP 8: Create staff policies
CREATE POLICY "Staff can view all drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid()));

CREATE POLICY "Staff can insert drug tests"
ON public.drug_tests
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid()));

CREATE POLICY "Staff can update drug tests"
ON public.drug_tests
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid()));

-- STEP 9: Verify new policies
SELECT 
    policyname,
    cmd as operation,
    qual as policy_condition
FROM pg_policies
WHERE tablename = 'drug_tests'
ORDER BY policyname;

-- DONE! Check the results above - especially STEP 4 to see if patient_id matches








