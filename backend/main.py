from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from database import engine, Base, check_database_connection
from routers import auth, patients, appointments, messages, videos, groups, leads, staff, facial_recognition, geolocation
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
    allow_origins=settings.allowed_origins if settings.allowed_origins != ["*"] else ["*"],
    allow_credentials=True if settings.allowed_origins != ["*"] else False,  # Can't use credentials with wildcard
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
app.include_router(leads.router, prefix="/api/leads", tags=["Leads"])
app.include_router(staff.router, prefix="/api/staff", tags=["Staff"])
app.include_router(facial_recognition.router, prefix="/api/facial-recognition", tags=["Facial Recognition"])
app.include_router(geolocation.router, prefix="/api/geolocation", tags=["Geolocation"])

@app.get("/")
async def root():
    return {"message": "Serenity Rehabilitation Center API", "status": "running"}

@app.get("/health")
async def health_check():
    db_status = check_database_connection()
    return {
        "status": "healthy" if db_status else "degraded",
        "service": "serenity-rehab-api", 
        "version": "1.0.0",
        "database": "connected" if db_status else "disconnected",
        "environment": settings.environment
    }

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
            "groups": "/api/groups",
            "staff": "/api/staff",
            "facial_recognition": "/api/facial-recognition",
            "geolocation": "/api/geolocation"
        }
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
