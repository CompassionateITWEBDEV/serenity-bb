-- Fix RLS policies for drug_tests table to allow patients to view their own tests
-- This script should be run in your Supabase SQL Editor

-- Step 1: Enable RLS if not already enabled
ALTER TABLE drug_tests ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Patients can view own drug tests" ON drug_tests;
DROP POLICY IF EXISTS "Patients can select own drug tests" ON drug_tests;
DROP POLICY IF EXISTS "Enable read access for patients" ON drug_tests;

-- Step 3: Create the policy that allows patients to view their own drug tests
-- This policy checks that auth.uid() matches the patient_id column
CREATE POLICY "Patients can view own drug tests"
ON drug_tests
FOR SELECT
USING (
  -- Check if the authenticated user is a patient and their user_id matches patient_id
  auth.uid() = patient_id
);

-- Step 4: Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'drug_tests' AND policyname = 'Patients can view own drug tests';

-- Step 5: Test the policy (optional - run this as the patient user)
-- SELECT * FROM drug_tests WHERE patient_id = auth.uid();

-- Expected result: The policy should allow patients to SELECT their own drug tests
-- where auth.uid() matches drug_tests.patient_id













