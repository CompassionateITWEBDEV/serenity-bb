# Fix: "Invalid API key" Error in Production

## Problem
The production site (`www.src.health`) is showing:
- **Error**: "Failed to fetch drug test"
- **Details**: "Invalid API key"
- **Status**: 500 Internal Server Error

This means the Supabase API key in Vercel is either missing, incorrect, or expired.

## Solution

### Step 1: Get Your Supabase API Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **⚠️ Keep this secret!**

### Step 2: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`serenity-bb` or similar)
3. Go to **Settings** → **Environment Variables**
4. Add or update these variables:

#### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Important:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - The **anon/public** key (safe to expose)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - The **service_role** key (keep secret!)
- ⚠️ Make sure all three are set for **Production** environment
- ⚠️ The API keys should start with `eyJ` (they're JWT tokens)

### Step 3: Redeploy

After updating environment variables:

1. **Option A: Automatic Redeploy**
   - Vercel will automatically redeploy if you have auto-deploy enabled
   - Wait a few minutes for the deployment to complete

2. **Option B: Manual Redeploy**
   - Go to **Deployments** tab
   - Click the **⋯** menu on the latest deployment
   - Select **Redeploy**
   - Or push a new commit to trigger a redeploy

### Step 4: Verify

1. Wait for deployment to complete
2. Visit `https://www.src.health/dashboard/drug-tests/[test-id]`
3. The error should be resolved
4. Check browser console - should no longer show "Invalid API key"

## Troubleshooting

### If the error persists:

1. **Check Vercel Logs**
   - Go to Vercel Dashboard → Your Project → **Deployments**
   - Click on the latest deployment
   - Check the **Logs** tab for any errors

2. **Verify Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Make sure variables are set for **Production** (not just Development)
   - Check that the values match exactly what's in Supabase (no extra spaces)

3. **Check Supabase Project Status**
   - Go to Supabase Dashboard
   - Make sure your project is active (not paused)
   - Check if you've hit any usage limits

4. **Test API Key Format**
   - The API key should be a long JWT token (100+ characters)
   - Should start with `eyJ`
   - Should not have quotes around it in Vercel

### Common Mistakes:

❌ **Wrong**: Using service_role key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - The anon key is safe to expose in client-side code
   - The service_role key should ONLY be in `SUPABASE_SERVICE_ROLE_KEY`

❌ **Wrong**: Adding quotes around the API key value
   - Vercel will include the quotes, making the key invalid
   - Just paste the key directly

❌ **Wrong**: Setting variables only for Development
   - Make sure they're set for **Production** environment
   - Or set for **All Environments**

## Expected Result

After fixing:
- ✅ Drug test detail pages load successfully
- ✅ No "Invalid API key" errors in console
- ✅ API requests return 200 status codes
- ✅ Data loads correctly from Supabase

## Still Not Working?

If the issue persists after following these steps:

1. Check Vercel deployment logs for specific error messages
2. Verify the Supabase project is the same one used in development
3. Ensure you're using the correct Supabase project (not a different one)
4. Check if there are any IP restrictions or firewall rules blocking Vercel





