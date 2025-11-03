-- Add RLS policies for drug_tests table
-- This allows patients to view their own drug tests

-- Enable RLS if not already enabled
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Patients can view own drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can view all drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can create drug tests" ON public.drug_tests;
DROP POLICY IF EXISTS "Staff can update drug tests" ON public.drug_tests;

-- Policy: Patients can view their own drug tests
-- This checks if the authenticated user is a patient and the drug test belongs to them
CREATE POLICY "Patients can view own drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (
  patient_id IN (
    SELECT user_id 
    FROM public.patients 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Staff can view all drug tests
CREATE POLICY "Staff can view all drug tests"
ON public.drug_tests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.staff 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Staff can create drug tests
CREATE POLICY "Staff can create drug tests"
ON public.drug_tests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.staff 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Staff can update drug tests
CREATE POLICY "Staff can update drug tests"
ON public.drug_tests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.staff 
    WHERE user_id = auth.uid()
  )
);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'drug_tests'
ORDER BY policyname;

