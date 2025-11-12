# Drug Test Feature - Vercel Deployment Troubleshooting

## Issue: Drug tests not appearing in Vercel deployment

### Common Causes & Solutions

#### 1. **Environment Variables Not Set in Vercel**

**Check:**
- Go to your Vercel project → Settings → Environment Variables
- Ensure these are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (optional, but recommended for RLS fallback)

**Fix:**
1. In Vercel dashboard, go to Project Settings → Environment Variables
2. Add all required Supabase environment variables
3. Redeploy the application

#### 2. **Row Level Security (RLS) Policies**

**Check:**
- In Supabase dashboard, go to Authentication → Policies
- Check if `drug_tests` table has RLS enabled
- Verify policies allow patients to SELECT their own records

**Fix:**
Run this SQL in your Supabase SQL Editor:

```sql
-- Enable RLS if not already enabled
ALTER TABLE drug_tests ENABLE ROW LEVEL SECURITY;

-- Policy: Patients can view their own drug tests
CREATE POLICY "Patients can view own drug tests"
ON drug_tests
FOR SELECT
USING (auth.uid() = patient_id);

-- Policy: Staff can view all drug tests (if needed)
CREATE POLICY "Staff can view all drug tests"
ON drug_tests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
  )
);
```

#### 3. **Database Table/Migration Missing**

**Check:**
- In Supabase dashboard, verify the `drug_tests` table exists
- Check if the `metadata` column exists (JSONB type)

**Fix:**
Run the migration SQL (if not already run):

```sql
-- Ensure drug_tests table exists with metadata column
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
  CONSTRAINT drug_tests_status_check CHECK ((lower(status) = ANY (ARRAY['pending'::text, 'completed'::text, 'missed'::text])))
);

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drug_tests' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE drug_tests ADD COLUMN metadata jsonb NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_drug_tests_patient ON public.drug_tests USING btree (patient_id);
CREATE INDEX IF NOT EXISTS idx_drug_tests_status ON public.drug_tests USING btree (lower(status));
CREATE INDEX IF NOT EXISTS idx_drug_tests_scheduled_for ON public.drug_tests USING btree (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_drug_tests_metadata ON public.drug_tests USING gin (metadata);
```

#### 4. **Build Errors**

**Check:**
- Go to Vercel dashboard → Deployments
- Check the latest deployment logs for build errors
- Look for TypeScript or ESLint errors

**Fix:**
- Review build logs for specific errors
- Ensure all dependencies are in `package.json`
- Check that `next.config.mjs` is correctly configured

#### 5. **API Route Errors**

**Check:**
- Open browser DevTools → Network tab
- Navigate to `/dashboard` or `/dashboard/drug-tests`
- Check for failed API requests to `/api/dashboard` or `/api/patient/drug-tests`
- Look for 401, 403, or 500 errors

**Fix:**
- Check Vercel Function logs for API route errors
- Verify authentication is working correctly
- Ensure cookies are being sent correctly (check SameSite settings)

#### 6. **Real-time Subscriptions Not Working**

**Check:**
- Real-time subscriptions require proper WebSocket support
- Vercel should support this, but verify in logs

**Fix:**
- Ensure Supabase real-time is enabled for the `drug_tests` table
- Run: `ALTER PUBLICATION supabase_realtime ADD TABLE drug_tests;`

### Quick Debugging Steps

1. **Check Vercel Function Logs:**
   - Go to Vercel Dashboard → Your Project → Functions
   - Check logs for `/api/dashboard` and `/api/patient/drug-tests`
   - Look for error messages

2. **Test API Routes Directly:**
   - Open browser console on Vercel deployment
   - Run: `fetch('/api/dashboard').then(r => r.json()).then(console.log)`
   - Check if `upcomingDrugTests` is in the response

3. **Verify Database Connection:**
   - In Supabase dashboard, check if queries work
   - Test: `SELECT * FROM drug_tests WHERE patient_id = 'your-patient-id'`

4. **Check Browser Console:**
   - Open DevTools on Vercel deployment
   - Look for JavaScript errors
   - Check Network tab for failed requests

### Verification Checklist

- [ ] Environment variables set in Vercel
- [ ] RLS policies configured correctly
- [ ] `drug_tests` table exists with `metadata` column
- [ ] No build errors in Vercel deployment logs
- [ ] API routes returning 200 status (not 401/403/500)
- [ ] Database connection working (test query in Supabase)
- [ ] Real-time enabled for `drug_tests` table

### Most Likely Issues

Based on the code structure, the most common issues are:

1. **RLS Policies** - Patients can't SELECT their own drug tests (80% likely)
2. **Environment Variables** - Missing or incorrect Supabase credentials (15% likely)
3. **Database Migration** - `metadata` column missing or table structure incorrect (5% likely)

### Next Steps

1. Check Vercel deployment logs first
2. Verify environment variables
3. Run RLS policy SQL script
4. Test API routes directly
5. Check browser console for errors











