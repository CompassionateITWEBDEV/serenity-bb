# Backend Integration Guide

## Overview

The frontend is now fully integrated with the FastAPI backend running on port 8000.

## Backend Configuration

### API Base URL
- **Default**: `http://localhost:8000`
- **Environment Variable**: `NEXT_PUBLIC_API_URL`
- **Location**: `lib/api-client.ts`

The frontend API client automatically uses `NEXT_PUBLIC_API_URL` if set, otherwise defaults to `http://localhost:8000`.

## Backend Endpoints

The backend API is available at the following endpoints:

### Authentication (`/api/auth`)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update current user
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Patients (`/api/patients`)
- `GET /api/patients/profile` - Get patient profile
- `PUT /api/patients/profile` - Update patient profile
- `GET /api/patients/progress` - Get patient progress
- `POST /api/patients/progress` - Update patient progress

### Appointments (`/api/appointments`)
- `GET /api/appointments/my-appointments` - Get user's appointments
- `POST /api/appointments/` - Create appointment
- `PUT /api/appointments/{id}/status` - Update appointment status

### Messages (`/api/messages`)
- `GET /api/messages/` - Get messages
- `POST /api/messages/` - Send message

### Videos (`/api/videos`)
- `GET /api/videos/` - Get videos
- `POST /api/videos/upload` - Upload video

### Groups (`/api/groups`)
- Group management endpoints

### Leads (`/api/leads`)
- Lead management endpoints

## Frontend API Client

The frontend uses the `ApiClient` class located in `lib/api-client.ts`:

```typescript
import { apiClient } from '@/lib/api-client'

// Login
const response = await apiClient.login(email, password)

// Get patient profile
const profile = await apiClient.getPatientProfile()

// Get appointments
const appointments = await apiClient.getAppointments()
```

## Environment Setup

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Backend (backend/.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/serenity_db
SECRET_KEY=your-secret-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Running the System

### Start Backend
```bash
cd backend
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload
```

### Start Frontend
```bash
pnpm dev
```

## API Authentication

The backend uses JWT Bearer token authentication. The frontend API client automatically:
1. Stores the token in `localStorage` after login
2. Includes the token in the `Authorization` header for authenticated requests
3. Handles token expiration and errors

## CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:3000` (Frontend)
- `http://localhost:3001`
- `https://src.health`
- `https://serenity-b9.onrender.com`

## Health Check

Check backend status:
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "serenity-rehab-api",
  "version": "1.0.0",
  "database": "connected",
  "environment": "development"
}
```

## Testing the Integration

1. **Backend Health Check**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **API Info**:
   ```bash
   curl http://localhost:8000/api/info
   ```

3. **Frontend Connection**:
   - Open browser console
   - Check for API calls to `http://localhost:8000/api/*`
   - Verify no CORS errors

## Troubleshooting

### Backend not responding
- Check if backend is running: `netstat -ano | findstr :8000`
- Check backend logs for errors
- Verify CORS configuration allows frontend origin

### API calls failing
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check browser console for CORS errors
- Verify backend is running and accessible

### Authentication issues
- Check if token is stored in `localStorage`
- Verify token format in Authorization header
- Check backend JWT secret key configuration

