# Drug Tests Table Schema Validation

## ✅ Schema Review - All Correct

Your SQL schema is **correct and matches the codebase**. Here's the validation:

### Table Structure
- ✅ `id` - UUID primary key with default `gen_random_uuid()`
- ✅ `patient_id` - UUID, NOT NULL, references `patients.user_id`
- ✅ `created_by` - UUID, nullable, references `staff.user_id`
- ✅ `status` - TEXT with check constraint (`pending`, `completed`, `missed`)
- ✅ `scheduled_for` - TIMESTAMP WITH TIME ZONE, nullable
- ✅ `created_at` - TIMESTAMP WITH TIME ZONE, default `now()`
- ✅ `updated_at` - TIMESTAMP WITH TIME ZONE, default `now()`
- ✅ `metadata` - JSONB, nullable, default `'{}'::jsonb`

### Foreign Key Relationships
- ✅ `drug_tests.patient_id` → `patients.user_id` (ON DELETE CASCADE)
- ✅ `drug_tests.created_by` → `staff.user_id` (ON DELETE SET NULL)

**Important**: The code correctly uses `user.id` (from Supabase Auth) to match against `drug_tests.patient_id`, which aligns with the foreign key to `patients.user_id`.

### Indexes
- ✅ `idx_drug_tests_patient` - B-tree on `patient_id` (for patient queries)
- ✅ `idx_drug_tests_status` - B-tree on `lower(status)` (for status filtering)
- ✅ `idx_drug_tests_scheduled_for` - B-tree on `scheduled_for` (for date queries)
- ✅ `idx_drug_tests_metadata` - GIN on `metadata` (for JSONB queries)

### Triggers
- ✅ `trg_drug_tests_updated_at` - Updates `updated_at` on row update
- ✅ `trg_set_drug_tests_created_by` - Sets `created_by` from context on insert

## ⚠️ Potential Issue: Row Level Security (RLS) Policies

If you're getting 404 errors when patients try to access their drug tests, it's likely due to **missing RLS policies**. Here are the recommended policies:

### Required RLS Policies for `drug_tests` Table

```sql
-- Enable RLS on drug_tests table
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

-- Policy: Patients can view their own drug tests
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
```

### Alternative: If RLS is too restrictive, you can use service role

If RLS policies are blocking access, the API routes use service role keys (via `SUPABASE_SERVICE_ROLE_KEY`) as a fallback, which bypasses RLS. However, it's better to have proper RLS policies for security.

## Code Verification

The codebase correctly:
1. ✅ Uses `user.id` to match against `drug_tests.patient_id`
2. ✅ Handles the foreign key relationship `drug_tests.patient_id` → `patients.user_id`
3. ✅ Includes `metadata` column in queries
4. ✅ Uses proper indexes for filtering

## Next Steps

1. **Verify RLS policies exist** - Check if RLS is enabled and if policies allow patient access
2. **Test the policies** - Ensure patients can SELECT their own drug tests
3. **Check the logs** - Use the enhanced logging we added to see exactly where the query fails

The schema itself is correct - the issue is likely in RLS policies or the query execution.

