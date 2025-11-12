# Fix: Staff Drug Tests Not Appearing in Dashboard

## Problem
Staff members cannot see drug tests in the staff dashboard. The page shows "No tests found" even when drug tests exist in the database.

## Root Cause
The `listDrugTests()` function in `lib/drug-tests.ts` queries Supabase directly from the client side, which respects Row Level Security (RLS) policies. The RLS policy for staff to view all drug tests is missing.

## Solution

### Step 1: Run the Updated SQL Script

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run the SQL Script**
   - Open and run: `scripts/SIMPLE_FIX_DRUG_TESTS_RLS.sql`
   - This script will:
     - Enable RLS on `drug_tests` table
     - Create policy for patients to view their own tests
     - **Create policy for staff to view ALL drug tests** (this is the fix!)

3. **Verify the Policies**
   - The script includes verification queries
   - You should see:
     - ✅ "Patients can view own drug tests" policy
     - ✅ "Staff can view all drug tests" policy

### Step 2: Test the Fix

1. **Refresh the Staff Dashboard**
   - Go to `/staff/dashboard?tab=tests`
   - Click on "Drug Tests" in the navigation
   - Drug tests should now appear in the list

2. **Verify Staff Can See All Tests**
   - Staff should see all drug tests (not just their own)
   - Tests should be filterable by status (pending, completed, missed)
   - Tests should be searchable by patient name/email

## What the SQL Script Does

The script creates two RLS policies:

1. **Patients Policy**: 
   ```sql
   CREATE POLICY "Patients can view own drug tests"
   ON drug_tests FOR SELECT
   USING (patient_id = auth.uid());
   ```
   - Allows patients to view only their own drug tests

2. **Staff Policy** (THIS IS THE FIX):
   ```sql
   CREATE POLICY "Staff can view all drug tests"
   ON drug_tests FOR SELECT
   USING (
     EXISTS (
       SELECT 1 FROM staff
       WHERE staff.user_id = auth.uid()
     )
   );
   ```
   - Allows staff members to view ALL drug tests
   - Checks if the authenticated user exists in the `staff` table

## Why This Works

- The `listDrugTests()` function in `lib/drug-tests.ts` queries Supabase directly:
  ```typescript
  const { data, error } = await supabase
    .from("drug_tests")
    .select(...)
    .order("created_at", { ascending: false });
  ```
- This query respects RLS policies
- Without the staff policy, RLS silently blocks staff from seeing any tests
- With the staff policy, staff can see all tests for management purposes

## Expected Result

After running the script:
- ✅ Staff dashboard shows all drug tests
- ✅ Staff can search and filter tests
- ✅ Staff can view test details in the dialog
- ✅ Patients can still only see their own tests
- ✅ No RLS blocking warnings in logs

## Troubleshooting

If drug tests still don't appear:

1. **Check if RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'drug_tests';
   ```
   Should show `rowsecurity = true`

2. **Check if policies exist:**
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'drug_tests';
   ```
   Should show both "Patients can view own drug tests" and "Staff can view all drug tests"

3. **Verify staff user exists:**
   ```sql
   SELECT user_id, active 
   FROM staff 
   WHERE user_id = auth.uid();
   ```
   Should return a row with `active = true`

4. **Check browser console:**
   - Look for any Supabase query errors
   - Check if RLS policies are being applied

## Next Steps

After the fix works:
- Staff can view all drug tests in the dashboard
- Staff can click "Open Test" to view full details (if detail page exists)
- Staff can manage drug tests for all patients










