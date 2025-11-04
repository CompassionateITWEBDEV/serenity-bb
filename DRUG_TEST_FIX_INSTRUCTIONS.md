# Fix Drug Test "Not Found" Error - Complete Instructions

## Problem
The drug test detail page shows "Drug test not found" error even though the test exists. This is typically caused by Row Level Security (RLS) policies blocking patient access.

## Solution Steps

### Step 1: Run RLS Policy SQL Script (REQUIRED)

**This must be done in your Supabase SQL Editor:**

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open and run the file: `scripts/fix_drug_tests_rls_for_patients.sql`

This script will:
- Enable RLS on the `drug_tests` table
- Create a policy that allows patients to view their own drug tests
- Verify the policy was created correctly

### Step 2: Verify Environment Variables (Local Development)

**For local development**, ensure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Optional but recommended
```

### Step 3: Verify Environment Variables (Vercel Production)

**For Vercel deployment**, add these in Vercel Dashboard:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Ensure these are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional but recommended for RLS fallback)

3. **Redeploy** after adding/changing environment variables

### Step 4: Test Locally

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Login as a patient who has drug tests assigned

3. Navigate to `/dashboard/drug-tests` and click on a drug test

4. The detail page should now load successfully

5. Check the browser console for any errors

6. Check the terminal/console for API logs (should see `[API] Successfully fetched drug test...`)

### Step 5: Test in Production

1. After deploying to Vercel, test the same flow

2. If it still doesn't work:
   - Check Vercel Function Logs for API errors
   - Verify RLS policies were applied in Supabase
   - Verify environment variables are set correctly

## How It Works

### RLS Policy
The SQL script creates a policy that allows patients to SELECT their own drug tests:
```sql
CREATE POLICY "Patients can view own drug tests"
ON drug_tests FOR SELECT
USING (auth.uid() = patient_id);
```

This ensures that:
- Patients can only see drug tests where `patient_id` matches their authenticated user ID
- The policy is enforced at the database level
- No additional application-level checks are needed

### Service Role Fallback
The API route includes a service role fallback that:
- First tries the regular query (with RLS)
- If RLS silently blocks (no error, no data), uses service role to verify
- If service role finds the test and it belongs to the patient, returns it
- This provides a workaround if RLS policies aren't configured yet

## Troubleshooting

### Still getting "Drug test not found"?

1. **Check RLS Policy:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'drug_tests';
   ```
   Should show a policy named "Patients can view own drug tests"

2. **Check if drug test exists:**
   ```sql
   SELECT id, patient_id, status FROM drug_tests WHERE id = 'your-test-id';
   ```

3. **Verify patient_id matches:**
   ```sql
   SELECT user_id FROM patients WHERE user_id = 'your-user-id';
   ```
   The `drug_tests.patient_id` should match `patients.user_id`

4. **Check API logs:**
   - Look for `[API] Initial query result` in server logs
   - Look for `[API] Using service role result` if RLS is blocking

5. **Test with service role directly:**
   - If service role key is set, the API should work even without RLS policies
   - This confirms the issue is RLS-related

## Expected Behavior After Fix

- ✅ Drug test detail page loads successfully
- ✅ Patients can see their own drug tests
- ✅ Patients cannot see other patients' drug tests
- ✅ API returns 200 status with drug test data
- ✅ No "Drug test not found" errors

## Files Changed

1. `app/api/patient/drug-tests/[id]/route.ts` - Improved RLS handling and service role fallback
2. `scripts/fix_drug_tests_rls_for_patients.sql` - RLS policy creation script




