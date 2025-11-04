-- DIAGNOSTIC: Check RLS configuration for drug_tests table
-- Run this in Supabase SQL Editor to diagnose RLS issues

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'drug_tests';

-- 2. List all RLS policies on drug_tests table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'drug_tests'
ORDER BY policyname;

-- 3. Check if patient record exists for a specific user (replace with actual user_id)
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID from the logs
SELECT 
  user_id,
  id as patient_id,
  created_at
FROM public.patients
WHERE user_id = 'ef5ee933-b013-4e1f-b03c-0928cc7ac7dc'; -- Replace with actual user_id from logs

-- 4. Check if drug test exists and belongs to patient (using service role bypass)
-- This should show the test if it exists
SELECT 
  id,
  patient_id,
  status,
  scheduled_for,
  created_at
FROM public.drug_tests
WHERE id = 'eb2ecef1-77fe-428b-8c39-bcd05b0dc62b'; -- Replace with actual test_id from logs

-- 5. Test if RLS policy would work (simulate as authenticated user)
-- This requires running as the authenticated user, so may not work in SQL Editor
-- But shows the expected policy check:
SELECT 
  'Expected policy check: patient_id = auth.uid()' as policy_description,
  'Current patient_id from drug_tests' as patient_id,
  'auth.uid() should match this value' as expected_match;

-- 6. Check for common RLS policy issues
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'drug_tests' 
      AND cmd = 'SELECT'
      AND policyname LIKE '%patient%'
    ) THEN '❌ MISSING: No SELECT policy for patients found'
    ELSE '✓ SELECT policy for patients exists'
  END as patient_select_policy_check,
  
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = 'drug_tests' 
      AND rowsecurity = true
    ) THEN '❌ WARNING: RLS not enabled on drug_tests table'
    ELSE '✓ RLS is enabled'
  END as rls_enabled_check;

-- RECOMMENDED FIX: Use the simpler direct policy
-- The issue is likely that the current policy uses a subquery which can have issues
-- The simpler policy: USING (patient_id = auth.uid()) should work better


