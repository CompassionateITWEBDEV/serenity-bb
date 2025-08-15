# Deployment Guide

## Frontend Deployment (Vercel)

1. **Connect to Vercel:**
   \`\`\`bash
   npm install -g vercel
   vercel login
   vercel
   \`\`\`

2. **Set Environment Variables in Vercel:**
   - `NEXT_PUBLIC_API_URL`: Your backend API URL

3. **Deploy:**
   \`\`\`bash
   npm run deploy
   \`\`\`

## Backend Deployment Options

### Option 1: Railway
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Deploy: `cd backend && railway up`

### Option 2: Render
1. Connect your GitHub repository to Render
2. Use the `backend/render.yaml` configuration
3. Deploy automatically on push to main

### Option 3: Docker
\`\`\`bash
# Build and run with Docker Compose
npm run docker:compose

# Or build individually
npm run docker:build
npm run docker:run
\`\`\`

## Environment Variables

### Frontend (.env.local)
\`\`\`
NEXT_PUBLIC_API_URL=https://your-backend-url.com
\`\`\`

### Backend (.env)
\`\`\`
DATABASE_URL=postgresql://user:password@host:port/database
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
\`\`\`

## Database Setup

1. Create a PostgreSQL database
2. Set the DATABASE_URL environment variable
3. The backend will automatically create tables on startup

## Health Checks

- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-api.com/health`
- API Documentation: `https://your-api.com/docs`
