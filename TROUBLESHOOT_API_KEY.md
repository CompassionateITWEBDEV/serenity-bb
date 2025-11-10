# 🔍 Troubleshooting: "Invalid API key" Error

## Current Status
- ✅ Key format looks correct (`eyJhbGciOiJIUzI1NiIs`)
- ✅ Key length is valid (208 characters)
- ✅ Supabase URL is correct (`https://cycakdfxcsjknxkqpasp.supabase.co`)
- ❌ Supabase still returns "Invalid API key"

## Possible Causes

### 1. **Key Doesn't Match Project** ⚠️ MOST LIKELY
The API key might be from a different Supabase project.

**Check:**
- Go to Supabase Dashboard → Select project `cycakdfxcsjknxkqpasp`
- Settings → API → Copy the **anon/public** key
- Compare character-by-character with what's in Vercel
- Make sure you're copying from the **correct project**

### 2. **Hidden Characters** ⚠️ COMMON
The key might have extra spaces, newlines, or quotes.

**Fix:**
- In Vercel, delete the entire value
- Copy the key from Supabase (Ctrl+A, Ctrl+C)
- Paste directly (don't add quotes)
- Check for any leading/trailing spaces
- Save

### 3. **Wrong Environment Variable Scope**
The key might only be set for Development, not Production.

**Check in Vercel:**
- Look at the environment variable
- See which environments it's applied to (should be "Production" or "All Environments")
- If it's only "Development", add it for "Production" too

### 4. **Key Was Regenerated**
If the key was regenerated in Supabase, the old one becomes invalid.

**Fix:**
- Check Supabase Dashboard → Settings → API
- If you see "Key rotated" or similar, get the new key
- Update Vercel with the fresh key

### 5. **Vercel Cache Issue**
Sometimes Vercel caches old values.

**Fix:**
- Update the environment variable
- **Manually trigger a redeploy** (don't wait for auto-deploy)
- Go to Deployments → Click "..." → Redeploy

## Verification Steps

### Step 1: Verify Key in Supabase
1. Go to https://supabase.com/dashboard
2. Select project `cycakdfxcsjknxkqpasp`
3. Settings → API
4. Copy the **anon/public** key
5. Note the first 20 characters: `eyJhbGciOiJIUzI1NiIs...`

### Step 2: Verify Key in Vercel
1. Go to Vercel Environment Variables
2. Find `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Click to view/edit
4. Check first 20 characters match Supabase
5. Check for any extra characters

### Step 3: Test with cURL (Optional)
You can test the key directly:
```bash
curl -H "apikey: YOUR_KEY_HERE" \
     -H "Authorization: Bearer YOUR_KEY_HERE" \
     https://cycakdfxcsjknxkqpasp.supabase.co/rest/v1/
```

If it returns JSON, the key is valid. If it returns an error about the API key, the key is wrong.

## Next Steps

1. **Double-check the key matches exactly** (character-by-character)
2. **Remove and re-add the environment variable** in Vercel
3. **Manually redeploy** after updating
4. **Check Vercel Function Logs** for the exact error code (PGRST302, PGRST401, etc.)

The debug info will now show:
- Error code from Supabase
- Whether key has spaces/newlines
- Key suffix (to verify it's complete)
- Full error details





