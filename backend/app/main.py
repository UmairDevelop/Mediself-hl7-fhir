from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.session import init_db
from app.api.endpoints import auth, patients, chat, audit, admin

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Clinician Patient Portal (FHIR + Gemini AI Assistant)",
    version="1.0.0"
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "healthy", "project": settings.PROJECT_NAME}

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients & Clinical Data"])
app.include_router(chat.router, prefix="/api/patients", tags=["AI Chat Assistant"])
app.include_router(audit.router, prefix="/api/audit", tags=["Compliance Audit Log"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin API Analytics & Settings"])
