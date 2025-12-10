# 🛠️ Development Setup Guide

## Quick Fix for Development Errors

If you're seeing "Invalid API key" or "Failed to fetch drug test" errors in development, follow these steps:

### Step 1: Check `.env.local` File

Make sure you have `.env.local` in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://cycakdfxcsjknxkqpasp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**To get these values:**
1. Go to https://supabase.com/dashboard
2. Select your project (ref: `cycakdfxcsjknxkqpasp`)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Fix RLS Policies (CRITICAL!)

The "Invalid API key" error is usually actually an **RLS policy issue**. Fix it:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the entire contents of `scripts/COMPLETE_DRUG_TESTS_SETUP.sql`
5. Click **Run**
6. Wait for success message

This will:
- ✅ Enable RLS on `drug_tests` table
- ✅ Create policy for patients to view their own tests
- ✅ Create policy for staff to view all tests
- ✅ Fix the access issues

### Step 3: Restart Development Server

After updating `.env.local` or running the SQL script:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
# or
pnpm dev
# or
yarn dev
```

### Step 4: Verify It Works

1. Open http://localhost:3000/dashboard/drug-tests
2. Check the browser console - you should see the actual error code
3. If you see `PGRST301` in the debug object, that's RLS - run Step 2 again

## Common Issues

### Issue: "Invalid API key" error persists
**Solution:** Check the `debug.errorCode` in the error response:
- If it's `PGRST301` → Run the SQL script (Step 2)
- If it's `PGRST302` → Check your `.env.local` API key
- If it's `null` or missing → Check terminal logs

### Issue: Environment variables not loading
**Solution:** 
1. Make sure `.env.local` is in the project root (not in a subfolder)
2. Restart the dev server after changing `.env.local`
3. Check that variables start with `NEXT_PUBLIC_` for client-side access

### Issue: RLS still blocking after running SQL
**Solution:**
1. Check Supabase SQL Editor → Run this query to verify:
   ```sql
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'drug_tests';
   ```
2. You should see at least 2 policies:
   - "Patients can view own drug tests"
   - "Staff can view all drug tests"
3. If missing, run `scripts/COMPLETE_DRUG_TESTS_SETUP.sql` again

## Testing in Development

After setup, you should see:
- ✅ No "Invalid API key" errors
- ✅ Drug tests load successfully
- ✅ Terminal shows `[API] ✅ Authentication successful`
- ✅ No RLS warnings in logs

## Still Having Issues?

1. **Check terminal logs** - Look for the `requestId` from the error
2. **Check browser console** - Look at the `debug` object in error responses
3. **Verify Supabase connection** - Try visiting Supabase Dashboard to ensure project is active
4. **Check network tab** - See if requests are reaching the API route



















