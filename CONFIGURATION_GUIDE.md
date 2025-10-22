# Serenity Rehabilitation Center - Configuration Guide

## Environment Variables Required

Create a `.env.local` file in the root directory with the following variables:

### Supabase Configuration (Required)
Based on your Supabase project: https://supabase.com/dashboard/project/cycakdfxcsjknxkqpasp

```bash
# Get these from: https://supabase.com/dashboard/project/cycakdfxcsjknxkqpasp/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://cycakdfxcsjknxkqpasp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Database Configuration
```bash
# Get this from: https://supabase.com/dashboard/project/cycakdfxcsjknxkqpasp/settings/database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.cycakdfxcsjknxkqpasp.supabase.co:5432/postgres
```

### JWT Configuration
```bash
SECRET_KEY=your_jwt_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Application Configuration
```bash
ENVIRONMENT=development
DEBUG=false
```

### File Upload Configuration
```bash
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

## Backend Configuration

The backend is now configured to:
- Use Supabase PostgreSQL database
- Support CORS for frontend domains
- Include health checks for database connectivity
- Use environment variables for all configuration

## Frontend Configuration

The frontend is configured to:
- Use Supabase for authentication and database
- Support both development and production environments
- Include proper error handling and fallbacks

## Getting Started

1. Set up your Supabase project
2. Copy the environment variables to `.env.local`
3. Run `npm run dev` for frontend
4. Run `python backend/main.py` for backend API

## Health Checks

- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:8000/health`
- Database status is included in the health check response
