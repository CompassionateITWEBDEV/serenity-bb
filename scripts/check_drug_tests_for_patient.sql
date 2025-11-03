-- Diagnostic script to check drug tests for a patient
-- Replace 'PATIENT_USER_ID_HERE' with the actual patient's user_id (from auth.users)

-- 1. Check if patient record exists
SELECT 
  'Patient Record Check' as check_type,
  user_id,
  full_name,
  email
FROM patients
WHERE user_id = 'PATIENT_USER_ID_HERE'; -- Replace with actual patient user_id

-- 2. Check all drug tests (to see what patient_ids are used)
SELECT 
  'All Drug Tests' as check_type,
  id,
  patient_id,
  status,
  scheduled_for,
  created_at
FROM drug_tests
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check drug tests for specific patient
SELECT 
  'Drug Tests for Patient' as check_type,
  id,
  patient_id,
  status,
  scheduled_for,
  created_at
FROM drug_tests
WHERE patient_id = 'PATIENT_USER_ID_HERE' -- Replace with actual patient user_id
ORDER BY created_at DESC;

-- 4. Check RLS policies on drug_tests table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'drug_tests';

-- 5. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'drug_tests';

-- 6. Count drug tests by patient_id (to see if there's a mismatch)
SELECT 
  patient_id,
  COUNT(*) as test_count,
  MAX(created_at) as latest_test
FROM drug_tests
GROUP BY patient_id
ORDER BY test_count DESC;

