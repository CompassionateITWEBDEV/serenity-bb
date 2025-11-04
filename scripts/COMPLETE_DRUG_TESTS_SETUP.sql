-- ============================================
-- COMPLETE DRUG_TESTS TABLE SETUP
-- Run this entire script in Supabase SQL Editor
-- This ensures all connections, foreign keys, and RLS policies are correct
-- ============================================

-- ============================================
-- PART 1: Create Table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.drug_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  scheduled_for timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  CONSTRAINT drug_tests_pkey PRIMARY KEY (id),
  CONSTRAINT drug_tests_created_by_fkey FOREIGN KEY (created_by) 
    REFERENCES staff (user_id) ON DELETE SET NULL,
  CONSTRAINT drug_tests_patient_id_fkey FOREIGN KEY (patient_id) 
    REFERENCES patients (user_id) ON DELETE CASCADE,
  CONSTRAINT drug_tests_status_check CHECK (
    lower(status) = ANY (
      ARRAY[
        'pending'::text,
        'completed'::text,
        'missed'::text
      ]
    )
  )
) TABLESPACE pg_default;

-- ============================================
-- PART 2: Create Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_drug_tests_patient 
  ON public.drug_tests USING btree (patient_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_drug_tests_status 
  ON public.drug_tests USING btree (lower(status)) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_drug_tests_scheduled_for 
  ON public.drug_tests USING btree (scheduled_for) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_drug_tests_metadata 
  ON public.drug_tests USING gin (metadata) 
  TABLESPACE pg_default;

-- ============================================
-- PART 3: Create Helper Functions (if not exists)
-- ============================================

-- Function to set updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set created_by from auth context
CREATE OR REPLACE FUNCTION set_drug_tests_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- If created_by is not set, try to get it from auth.uid()
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: Create Triggers
-- ============================================
DROP TRIGGER IF EXISTS trg_drug_tests_updated_at ON public.drug_tests;
CREATE TRIGGER trg_drug_tests_updated_at 
  BEFORE UPDATE ON public.drug_tests 
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_set_drug_tests_created_by ON public.drug_tests;
CREATE TRIGGER trg_set_drug_tests_created_by 
  BEFORE INSERT ON public.drug_tests 
  FOR EACH ROW
  EXECUTE FUNCTION set_drug_tests_created_by();

-- ============================================
-- PART 5: Enable Row Level Security
-- ============================================
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 6: Drop Existing Policies (to avoid conflicts)
-- ============================================
DROP POLICY IF EXISTS "Patients can view own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Patients can select own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can view all drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can create drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can insert drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can update drug tests" ON public.drug_tests;

-- ============================================
-- PART 7: Create RLS Policies
-- ============================================

-- Policy 1: Patients can view their own drug tests
-- CRITICAL: This uses patient_id = auth.uid() because:
--   - drug_tests.patient_id references patients.user_id
--   - For authenticated patients, patients.user_id = auth.uid()
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- Policy 2: Staff can view ALL drug tests (for staff dashboard)
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
-- PART 8: Enable Real-time (for live updates)
-- ============================================
-- This allows real-time subscriptions to work
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS drug_tests;

-- ============================================
-- PART 9: Verification Queries
-- ============================================

-- Check 1: Verify table exists and has correct structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'drug_tests'
ORDER BY ordinal_position;

-- Check 2: Verify foreign keys are connected
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'drug_tests';

-- Check 3: Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS is enabled'
    ELSE '❌ RLS is NOT enabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'drug_tests';

-- Check 4: List all RLS policies
SELECT 
  policyname,
  cmd as operation,
  qual as policy_condition,
  CASE 
    WHEN policyname = 'Patients can view own drug tests' AND qual LIKE '%patient_id%' AND qual LIKE '%auth.uid()%' THEN '✅ Correct'
    WHEN policyname = 'Staff can view all drug tests' AND qual LIKE '%staff%' AND qual LIKE '%auth.uid()%' THEN '✅ Correct'
    WHEN policyname LIKE '%create%' OR policyname LIKE '%insert%' THEN '✅ Correct'
    WHEN policyname LIKE '%update%' THEN '✅ Correct'
    ELSE '⚠️ Review needed'
  END as verification
FROM pg_policies
WHERE tablename = 'drug_tests'
ORDER BY policyname;

-- Check 5: Verify indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'drug_tests'
ORDER BY indexname;

-- Check 6: Verify triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'drug_tests'
ORDER BY trigger_name;

-- ============================================
-- SUCCESS CHECKLIST
-- ============================================
-- After running this script, you should see:
-- ✅ Table created with all columns
-- ✅ 2 foreign keys connected (patient_id → patients.user_id, created_by → staff.user_id)
-- ✅ 4 indexes created (patient_id, status, scheduled_for, metadata)
-- ✅ 2 triggers created (updated_at, created_by)
-- ✅ RLS enabled
-- ✅ 4 policies created (Patients SELECT, Staff SELECT, Staff INSERT, Staff UPDATE)
-- ✅ Real-time enabled for live updates
--
-- Test by:
-- 1. As a patient: Visit /dashboard/drug-tests - should see your own tests
-- 2. As staff: Visit /staff/dashboard - should see all drug tests
-- 3. Check Vercel logs - no "RLS BLOCKING DETECTED" warnings
