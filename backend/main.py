from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from routers import auth, patients, appointments, messages, videos, groups
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
Base.metadata.create_all(bind=engine)
yield


app = FastAPI(
title="Serenity Rehabilitation Center API",
description="Backend API for patient management and rehabilitation services",
version="1.0.0",
lifespan=lifespan,
)


_cors_common = dict(allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
if settings.allow_origin_regex:
app.add_middleware(CORSMiddleware, allow_origin_regex=settings.allow_origin_regex, **_cors_common)
else:
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, **_cors_common)


# Routers
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
"groups": "/api/groups",
},
}


if __name__ == "__main__":
import uvicorn
uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
