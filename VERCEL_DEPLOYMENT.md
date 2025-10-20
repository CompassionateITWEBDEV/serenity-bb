# Vercel Deployment Guide

## Required Environment Variables

Before deploying to Vercel, you **must** set these environment variables in your Vercel project settings:

### Required Variables

1. **`NEXT_PUBLIC_SUPABASE_URL`** - Your Supabase project URL
   - Example: `https://your-project.supabase.co`
   - Get this from: Supabase Dashboard → Project Settings → API

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** - Your Supabase anonymous key
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Get this from: Supabase Dashboard → Project Settings → API

3. **`SUPABASE_SERVICE_ROLE_KEY`** - Your Supabase service role key (for API routes)
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Get this from: Supabase Dashboard → Project Settings → API → service_role key
   - ⚠️ **Keep this secret!** Do not expose in client-side code.

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: The actual value
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**

## Deployment Steps

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### Option 2: Deploy via Git Integration

1. Push your code to GitHub/GitLab/Bitbucket
2. Import the repository in Vercel
3. Add environment variables (see above)
4. Deploy!

## Troubleshooting

### Build Error: "An unexpected error happened"

This generic error usually means:

1. **Missing environment variables** - Double-check all required variables are set
2. **Build timeout** - The build is taking too long (especially for large files)
3. **Memory issues** - The build is running out of memory

#### Solutions:

1. **Verify all environment variables are set correctly**
   ```bash
   # In Vercel dashboard, check:
   NEXT_PUBLIC_SUPABASE_URL ✓
   NEXT_PUBLIC_SUPABASE_ANON_KEY ✓
   SUPABASE_SERVICE_ROLE_KEY ✓
   ```

2. **Check build logs**
   - Go to Vercel → Deployments → Click on failed deployment → View logs
   - Look for specific error messages

3. **Increase build timeout (if needed)**
   - Contact Vercel support to increase timeout limits
   - Or upgrade to Pro plan for longer timeouts

4. **Optimize your build**
   ```bash
   # Locally test the build
   pnpm install
   pnpm run build
   ```

### Build succeeds locally but fails on Vercel

Common causes:
- Environment variables not set in Vercel
- Different Node.js version (this project requires Node 20)
- Missing `.env.local` values that need to be in Vercel

### Node.js Version Issues

This project requires **Node.js 20**. Vercel should automatically detect this from `package.json`:

```json
"engines": {
  "node": ">=20 <21"
}
```

If you need to override, add to `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "pnpm install --no-frozen-lockfile"
}
```

## Performance Optimization

The `/call/[conversationId]` page is quite large (25 kB). Consider:

1. **Code splitting** - Break down the 3000+ line component into smaller modules
2. **Dynamic imports** - Use `next/dynamic` for heavy components
3. **Lazy loading** - Load features only when needed

## Support

If the build still fails after following this guide:

1. Check the [Vercel build logs](https://vercel.com/docs/deployments/troubleshoot-a-build)
2. Contact [Vercel Support](https://vercel.com/help)
3. Share the specific error message from build logs

## Successful Build Indicators

You should see:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

If you see this, your deployment was successful! 🎉
