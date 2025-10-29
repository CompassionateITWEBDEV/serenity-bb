-- Fix infinite recursion in staff_verifications RLS policies
-- The issue: Multiple overlapping SELECT policies can cause recursion, especially when policies reference other tables

-- Drop all existing policies on staff_verifications
DROP POLICY IF EXISTS "Authenticated users can view verifications" ON staff_verifications;
DROP POLICY IF EXISTS "Staff can view their own verifications" ON staff_verifications;
DROP POLICY IF EXISTS "Patients can create verifications" ON staff_verifications;
DROP POLICY IF EXISTS "Patients can update their own verifications" ON staff_verifications;

-- Recreate policies with simpler, non-recursive conditions
-- CRITICAL: Do NOT reference other tables in policies to avoid recursion
-- Single SELECT policy that covers both patients and staff viewing
-- Uses simple OR logic without subqueries to avoid recursion
CREATE POLICY "Users can view relevant verifications" ON staff_verifications
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      auth.uid() = patient_id OR 
      auth.uid() = staff_id
    )
  );

-- Patients can insert their own verifications (no subqueries)
CREATE POLICY "Patients can create verifications" ON staff_verifications
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Patients can update their own verifications (no subqueries)
CREATE POLICY "Patients can update their own verifications" ON staff_verifications
  FOR UPDATE USING (auth.uid() = patient_id);

-- Verify policies don't cause recursion by checking they only use:
-- 1. auth.uid() directly
-- 2. Column values from the same table
-- 3. No EXISTS subqueries on other tables

