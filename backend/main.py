from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
from database import engine, Base
from routers import auth, patients, appointments, messages, videos, groups
from config import settings

# Create database tables
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Serenity Rehabilitation Center API",
    description="Backend API for patient management and rehabilitation services",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-frontend-domain.com",
        "https://*.vercel.app",
        "https://*.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messages"])
app.include_router(videos.router, prefix="/api/videos", tags=["Videos"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])

@app.get("/")
async def root():
    return {"message": "Serenity Rehabilitation Center API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "serenity-rehab-api", "version": "1.0.0"}

@app.get("/api/info")
async def api_info():
    return {
        "name": "Serenity Rehabilitation Center API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "patients": "/api/patients",
            "appointments": "/api/appointments",
            "messages": "/api/messages",
            "videos": "/api/videos",
            "groups": "/api/groups"
        }
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
