-- Check if RLS is enabled and what policies exist for drug_tests table

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'drug_tests';

-- 2. Check existing policies
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
WHERE tablename = 'drug_tests'
ORDER BY policyname;

-- 3. If no policies exist, you need to create them
-- Run the add_drug_tests_rls_policy.sql script

