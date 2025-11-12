-- FINAL FIX - COPY ALL AND RUN IN SUPABASE SQL EDITOR NOW
-- This will fix the RLS issue permanently

-- Step 1: Drop ALL policies
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'drug_tests') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.drug_tests', r.policyname);
    END LOOP;
END $$;

-- Step 2: Make sure RLS is enabled
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- Step 3: Create the patient policy - THIS IS THE KEY ONE
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- Step 4: Create staff policies
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

-- DONE! Now refresh your browser.








