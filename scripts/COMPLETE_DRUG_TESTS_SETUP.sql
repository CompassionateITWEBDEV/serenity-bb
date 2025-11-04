-- Complete Drug Tests Table Setup and RLS Fix
-- Run this script in your Supabase SQL Editor to ensure:
-- 1. The table exists with correct structure
-- 2. Indexes are created
-- 3. Triggers are set up
-- 4. RLS policies allow patients to view their own drug tests

-- ============================================
-- PART 1: Create table if it doesn't exist
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
  CONSTRAINT drug_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES staff (user_id) ON DELETE SET NULL,
  CONSTRAINT drug_tests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients (user_id) ON DELETE CASCADE,
  CONSTRAINT drug_tests_status_check CHECK (
    (
      lower(status) = ANY (
        ARRAY[
          'pending'::text,
          'completed'::text,
          'missed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- ============================================
-- PART 2: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_drug_tests_patient ON public.drug_tests USING btree (patient_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_drug_tests_status ON public.drug_tests USING btree (lower(status)) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_drug_tests_scheduled_for ON public.drug_tests USING btree (scheduled_for) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_drug_tests_metadata ON public.drug_tests USING gin (metadata) TABLESPACE pg_default;

-- ============================================
-- PART 3: Create helper functions if needed
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
  -- This assumes the user creating the record is staff
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 4: Create triggers
-- ============================================

-- Trigger to update updated_at on UPDATE
DROP TRIGGER IF EXISTS trg_drug_tests_updated_at ON drug_tests;
CREATE TRIGGER trg_drug_tests_updated_at
  BEFORE UPDATE ON drug_tests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Trigger to set created_by on INSERT
DROP TRIGGER IF EXISTS trg_set_drug_tests_created_by ON drug_tests;
CREATE TRIGGER trg_set_drug_tests_created_by
  BEFORE INSERT ON drug_tests
  FOR EACH ROW
  EXECUTE FUNCTION set_drug_tests_created_by();

-- ============================================
-- PART 5: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE drug_tests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 6: Drop existing policies (cleanup)
-- ============================================
DROP POLICY IF EXISTS "Patients can view own drug tests" ON drug_tests;
DROP POLICY IF EXISTS "Patients can select own drug tests" ON drug_tests;
DROP POLICY IF EXISTS "Enable read access for patients" ON drug_tests;
DROP POLICY IF EXISTS "Staff can view all drug tests" ON drug_tests;

-- ============================================
-- PART 7: Create RLS Policies
-- ============================================

-- Policy: Patients can view their own drug tests
-- This is the critical policy that allows patients to SELECT where patient_id = auth.uid()
CREATE POLICY "Patients can view own drug tests"
ON drug_tests
FOR SELECT
USING (
  -- The authenticated user's ID matches the patient_id
  auth.uid() = patient_id
);

-- Policy: Staff can view all drug tests (optional, but recommended)
-- This allows staff members to view all drug tests for patient management
CREATE POLICY "Staff can view all drug tests"
ON drug_tests
FOR SELECT
USING (
  -- Check if the authenticated user is a staff member
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
  )
);

-- Policy: Staff can insert drug tests
CREATE POLICY "Staff can insert drug tests"
ON drug_tests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
  )
);

-- Policy: Staff can update drug tests
CREATE POLICY "Staff can update drug tests"
ON drug_tests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
  )
);

-- ============================================
-- PART 8: Enable real-time for drug_tests table
-- ============================================
-- This allows real-time subscriptions to work
ALTER PUBLICATION supabase_realtime ADD TABLE drug_tests;

-- ============================================
-- PART 9: Verification queries
-- ============================================

-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'drug_tests';

-- List all policies on drug_tests table
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

-- Verify indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'drug_tests'
ORDER BY indexname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Drug tests table setup complete!';
  RAISE NOTICE '✅ RLS policies created successfully';
  RAISE NOTICE '✅ Patients can now view their own drug tests';
  RAISE NOTICE '✅ Staff can view and manage all drug tests';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test as a patient user to verify they can see their drug tests';
  RAISE NOTICE '2. Check Vercel Function logs - RLS bypass warnings should stop';
  RAISE NOTICE '3. Verify real-time subscriptions work correctly';
END $$;

