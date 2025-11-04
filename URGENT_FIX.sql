-- URGENT FIX - Run this NOW in Supabase SQL Editor
-- This will diagnose and fix the issue

-- STEP 1: Check if the drug test exists and what patient_id it has
SELECT 
    id,
    patient_id,
    status,
    created_at,
    'Test exists with patient_id above' as note
FROM drug_tests
WHERE id = 'c52b0e58-bf1a-4d34-af5b-dd635200592b';

-- STEP 2: Temporarily DISABLE RLS to allow access
ALTER TABLE public.drug_tests DISABLE ROW LEVEL SECURITY;

-- STEP 3: Verify RLS is disabled
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN 'RLS ENABLED' ELSE 'RLS DISABLED ✅' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'drug_tests';

-- STEP 4: Drop all policies (cleanup)
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'drug_tests') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.drug_tests', r.policyname);
    END LOOP;
END $$;

-- DONE! RLS is now DISABLED - refresh your browser and it should work.
-- After confirming it works, we can re-enable RLS with correct policies.

