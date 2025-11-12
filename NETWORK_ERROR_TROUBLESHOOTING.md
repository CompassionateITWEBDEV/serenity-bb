# Network Error Troubleshooting Guide

## Error: "Network error: Unable to connect to the server"

This error occurs when the browser cannot reach the Next.js API routes. Here's how to fix it:

## Quick Fixes

### 1. **Check if Development Server is Running** (Most Common)

The Next.js development server must be running for API routes to work.

**Fix:**
1. Open a terminal/command prompt
2. Navigate to your project directory
3. Run:
   ```bash
   npm run dev
   ```
   or
   ```bash
   pnpm dev
   ```
   or
   ```bash
   yarn dev
   ```

4. Wait for the server to start (you should see "Ready" message)
5. The server should be running on `http://localhost:3000`

### 2. **Check Server Port**

If port 3000 is already in use, the server might be on a different port.

**Fix:**
- Check the terminal output for the actual port (e.g., `http://localhost:3001`)
- Update your browser URL to match the port shown in the terminal

### 3. **Verify API Route Exists**

Make sure the API route file exists:
- `app/api/patient/drug-tests/[id]/route.ts` should exist

### 4. **Check Browser Console**

Open DevTools (F12) → Console tab and look for:
- `[Detail Page] Attempting fetch:` - Shows the URL being requested
- `[Detail Page] Fetch failed (network error):` - Shows the actual error
- Error details will show the exact problem

### 5. **Test API Route Directly**

Open your browser and go to:
```
http://localhost:3000/api/health
```

If this doesn't work, the dev server isn't running or there's a configuration issue.

## Common Issues & Solutions

### Issue: "Failed to fetch" or "ERR_CONNECTION_REFUSED"
**Cause:** Dev server not running  
**Solution:** Start the dev server with `npm run dev`

### Issue: "Request timeout"
**Cause:** Server is running but taking too long to respond  
**Solution:** 
- Check server terminal for errors
- Restart the dev server
- Check if there are database connection issues

### Issue: "CORS error" or "Blocked by CORS policy"
**Cause:** CORS configuration issue  
**Solution:** This shouldn't happen in development, but if it does, check `next.config.mjs`

### Issue: API route returns 404
**Cause:** Route file doesn't exist or path is wrong  
**Solution:** Verify the file `app/api/patient/drug-tests/[id]/route.ts` exists

## Step-by-Step Debugging

1. **Check if server is running:**
   ```bash
   # In PowerShell:
   Get-Process -Name node
   ```
   If you see node processes, the server might be running.

2. **Check server logs:**
   - Look at the terminal where you ran `npm run dev`
   - Check for any errors or warnings
   - Look for `[API]` log messages when you try to load the drug test

3. **Test a simple API route:**
   - Go to `http://localhost:3000/api/health` in your browser
   - If this works, API routes are functioning
   - If this doesn't work, the dev server isn't running properly

4. **Check browser network tab:**
   - Open DevTools → Network tab
   - Try to load the drug test page
   - Look for the request to `/api/patient/drug-tests/[id]`
   - Check the status code and error message

5. **Verify environment variables:**
   - Check `.env.local` file exists
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

## Expected Behavior

When working correctly:
- ✅ Dev server shows "Ready" message
- ✅ Browser can access `http://localhost:3000`
- ✅ API routes respond (test with `/api/health`)
- ✅ Drug test detail page loads without network errors
- ✅ Console shows `[Detail Page] API response: { status: 200, ok: true }`

## Still Not Working?

1. **Restart everything:**
   - Stop the dev server (Ctrl+C)
   - Close all browser tabs
   - Restart the dev server
   - Open a fresh browser tab

2. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

3. **Check for port conflicts:**
   - If port 3000 is busy, try: `npm run dev -- -p 3001`
   - Update browser URL to match

4. **Check firewall/antivirus:**
   - Some firewalls block localhost connections
   - Temporarily disable to test

5. **Check terminal logs:**
   - Look for any error messages in the dev server terminal
   - Share the error message if you need help













