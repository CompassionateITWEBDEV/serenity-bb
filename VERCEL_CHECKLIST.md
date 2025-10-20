# ✅ Vercel Deployment Checklist

Use this checklist to ensure your deployment succeeds:

## Before Deploying

- [ ] **Environment Variables Set in Vercel**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` 
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] Set for: Production, Preview, Development

- [ ] **Local Build Test**
  ```bash
  pnpm install --no-frozen-lockfile
  pnpm run build
  ```
  - [ ] Build completes without errors
  - [ ] No TypeScript errors
  - [ ] No missing dependencies

- [ ] **Environment Variable Verification**
  ```bash
  npm run verify-env
  ```
  - [ ] All required variables present
  - [ ] Values are correct (not placeholders)

## During Deployment

- [ ] **Push to Git** or **Deploy via Vercel CLI**
- [ ] **Monitor Build Logs** in Vercel dashboard
- [ ] **Check for warnings** (yellow warnings are OK, red errors are not)

## After Deployment

- [ ] **Test the deployed site**
  - [ ] Home page loads
  - [ ] Login works
  - [ ] Dashboard accessible
  - [ ] Video call page works

- [ ] **Check for Runtime Errors**
  - [ ] Open browser console (F12)
  - [ ] Look for any red errors
  - [ ] Test main features

## If Build Fails

1. [ ] Check Vercel build logs for specific error
2. [ ] Verify environment variables are set correctly
3. [ ] Ensure Node.js version is 20 (check package.json)
4. [ ] Try redeploying (sometimes transient errors occur)
5. [ ] Contact Vercel support with error details

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Missing environment variable" | Set in Vercel → Settings → Environment Variables |
| "Build timeout" | Contact Vercel support to increase timeout |
| "Cannot find module" | Run `pnpm install --no-frozen-lockfile` |
| "Type error" | TypeScript errors are currently ignored (see next.config.mjs) |

## Quick Commands

```bash
# Verify environment
npm run verify-env

# Test build locally
pnpm run build

# Deploy to Vercel
vercel --prod

# View logs
vercel logs <deployment-url>
```

## Need Help?

- 📖 Read: `VERCEL_DEPLOYMENT.md` (detailed guide)
- 📝 Review: `DEPLOYMENT_FIX_SUMMARY.md` (what was fixed)
- 🔍 Check: `.env.example` (required variables)
- 🆘 Contact: [Vercel Support](https://vercel.com/help)

---

**Ready to deploy?** Make sure all checkboxes above are checked! ✅
