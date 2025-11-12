# ⚡ Quick Fix: Invalid API Key Error

## Current Error
```
Server configuration error
Invalid API key. Please check Supabase environment variables in Vercel.
```

## ✅ 5-Minute Fix Checklist

### Step 1: Get Your Supabase API Key
- [ ] Go to https://supabase.com/dashboard
- [ ] Select your project (ref: `cycakdfxcsjknxkqpasp`)
- [ ] Click **Settings** → **API**
- [ ] Copy the **anon/public** key (starts with `eyJ...`)
- [ ] Copy the **Project URL** (should be `https://cycakdfxcsjknxkqpasp.supabase.co`)

### Step 2: Update Vercel Environment Variables
- [ ] Go to https://vercel.com/dashboard
- [ ] Select your project (`serenity-bb` or similar)
- [ ] Click **Settings** → **Environment Variables**
- [ ] Find `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] Value should be: `https://cycakdfxcsjknxkqpasp.supabase.co`
  - [ ] Environment: **Production** (and Preview/Development if needed)
- [ ] Find `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] **UPDATE** with the anon/public key from Step 1
  - [ ] Environment: **Production** (and Preview/Development if needed)
  - [ ] Make sure there are NO quotes around the value
  - [ ] Make sure there are NO extra spaces
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is also set (for server-side operations)

### Step 3: Redeploy
- [ ] After saving environment variables, Vercel will show a notification
- [ ] Click **Redeploy** or wait for auto-redeploy
- [ ] Wait for deployment to complete (usually 2-5 minutes)

### Step 4: Verify Fix
- [ ] Visit `https://www.src.health/dashboard/drug-tests/eb2ecef1-77fe-428b-8c39-bcd05b0dc62b`
- [ ] The error should be gone
- [ ] Drug test details should load successfully

## 🔍 How to Verify Your API Key is Correct

The API key should:
- ✅ Start with `eyJ` (it's a JWT token)
- ✅ Be 200+ characters long
- ✅ Match exactly what's in Supabase Dashboard (no extra characters)
- ✅ Be set for **Production** environment in Vercel

## ⚠️ Common Mistakes

❌ **Wrong**: Setting the key only for "Development" environment
   - Must be set for **Production**!

❌ **Wrong**: Adding quotes around the API key value
   - Vercel will include the quotes, making it invalid

❌ **Wrong**: Using service_role key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Use the **anon/public** key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Use the **service_role** key for `SUPABASE_SERVICE_ROLE_KEY`

❌ **Wrong**: Using API key from a different Supabase project
   - Make sure the project ref matches: `cycakdfxcsjknxkqpasp`

## 📞 Still Not Working?

If the error persists after updating:
1. Check Vercel deployment logs for detailed error messages
2. Verify the environment variables are saved (refresh the page)
3. Make sure you redeployed after updating variables
4. Check Supabase project is active (not paused or deleted)








