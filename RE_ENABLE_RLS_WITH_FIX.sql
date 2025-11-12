-- Run this AFTER URGENT_FIX.sql works
-- This will re-enable RLS with correct policies

-- Step 1: Enable RLS
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- Step 2: Create patient policy
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- Step 3: Create staff policies
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

-- DONE! RLS is now enabled with correct policies.








