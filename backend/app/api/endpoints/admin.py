from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, desc, func
from app.config import settings
from app.db.session import get_session
from app.db.models import User, ApiUsageLog, SystemSetting, Role
from app.core.permissions import can
from app.api.deps import get_current_user

router = APIRouter()

class SettingUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    fhir_server_url: Optional[str] = None
    max_tokens_per_request: Optional[int] = None

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str

@router.get("/metrics")
def get_api_metrics(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "audit.view"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Admin access required for API analytics."
        )

    # Fetch all usage logs
    logs = session.exec(select(ApiUsageLog).order_by(desc(ApiUsageLog.createdAt))).all()

    total_requests = len(logs)
    total_prompt_tokens = sum(l.promptTokens for l in logs)
    total_candidate_tokens = sum(l.candidateTokens for l in logs)
    total_tokens = sum(l.totalTokens for l in logs)
    
    # Calculate average latency
    avg_latency = round(sum(l.latencyMs for l in logs) / total_requests, 2) if total_requests > 0 else 0.0

    # Estimated cost ($0.000075 per 1,000 tokens for Gemini Flash)
    estimated_cost = round((total_tokens / 1000) * 0.000075, 4)

    # User breakdown
    user_counts: Dict[str, Dict[str, Any]] = {}
    for l in logs:
        email = l.userEmail
        if email not in user_counts:
            user_counts[email] = {
                "name": l.userName,
                "email": email,
                "requests": 0,
                "tokens": 0
            }
        user_counts[email]["requests"] += 1
        user_counts[email]["tokens"] += l.totalTokens

    # Active AI status
    has_api_key = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) > 10)
    active_mode = "Gemini 2.5 Flash API (Cloud)" if has_api_key else "Local Clinical Engine (Offline Fallback)"

    # Formatted logs
    recent_logs = []
    for l in logs[:50]:
        recent_logs.append({
            "id": l.id,
            "userName": l.userName,
            "userEmail": l.userEmail,
            "patientId": l.patientId,
            "modelName": l.modelName,
            "promptTokens": l.promptTokens,
            "candidateTokens": l.candidateTokens,
            "totalTokens": l.totalTokens,
            "latencyMs": l.latencyMs,
            "status": l.status,
            "createdAt": l.createdAt.isoformat()
        })

    return {
        "summary": {
            "total_requests": total_requests,
            "total_prompt_tokens": total_prompt_tokens,
            "total_candidate_tokens": total_candidate_tokens,
            "total_tokens": total_tokens,
            "estimated_cost_usd": estimated_cost,
            "avg_latency_ms": avg_latency,
            "active_mode": active_mode,
            "has_gemini_key": has_api_key
        },
        "user_breakdown": list(user_counts.values()),
        "usage_logs": recent_logs
    }

@router.get("/settings")
async def get_system_settings(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "audit.view"):
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")

    from app.services.fhir_service import fhir_service
    fhir_health = await fhir_service.test_connection(settings.FHIR_SERVER_BASE_URL)

    # Mask API key for security
    masked_key = ""
    if settings.GEMINI_API_KEY:
        k = settings.GEMINI_API_KEY.strip()
        if len(k) > 8:
            masked_key = k[:4] + "..." + k[-4:]
        else:
            masked_key = "********"

    return {
        "gemini_api_key_masked": masked_key,
        "has_gemini_key": bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) > 10),
        "fhir_server_url": settings.FHIR_SERVER_BASE_URL,
        "fhir_health": fhir_health,
        "database_url": settings.DATABASE_URL.split("://")[0] + "://***",
        "environment": "Development / Sandbox"
    }

@router.put("/settings")
def update_system_settings(
    payload: SettingUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "audit.view"):
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")

    if payload.gemini_api_key is not None:
        settings.GEMINI_API_KEY = payload.gemini_api_key.strip()
        # Persist setting in DB
        db_setting = session.exec(select(SystemSetting).where(SystemSetting.key == "gemini_api_key")).first()
        if not db_setting:
            db_setting = SystemSetting(key="gemini_api_key", value=payload.gemini_api_key.strip())
        else:
            db_setting.value = payload.gemini_api_key.strip()
        session.add(db_setting)
        session.commit()

    if payload.fhir_server_url is not None:
        settings.FHIR_SERVER_BASE_URL = payload.fhir_server_url.strip()
        db_setting = session.exec(select(SystemSetting).where(SystemSetting.key == "fhir_server_url")).first()
        if not db_setting:
            db_setting = SystemSetting(key="fhir_server_url", value=payload.fhir_server_url.strip())
        else:
            db_setting.value = payload.fhir_server_url.strip()
        session.add(db_setting)
        session.commit()

    return {"message": "Settings updated successfully", "has_gemini_key": bool(settings.GEMINI_API_KEY)}

# --- USER & STAFF MANAGEMENT ---

@router.get("/users")
def list_users(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "audit.view"):
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")

    users = session.exec(select(User)).all()
    res = []
    for u in users:
        res.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.value,
        })
    return {"users": res}

@router.post("/users")
def create_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "audit.view"):
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")

    from app.db.session import hash_password

    existing = session.exec(select(User).where(User.email == payload.email.strip().lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    try:
        user_role = Role(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {payload.role}")

    new_user = User(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        role=user_role
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    from app.api.endpoints.patients import record_audit
    record_audit(session, current_user, "system", "user.create", {"created_user": new_user.email, "role": new_user.role.value})

    return {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role.value
    }

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "audit.view"):
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own active administrator account.")

    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    deleted_email = target_user.email
    session.delete(target_user)
    session.commit()

    from app.api.endpoints.patients import record_audit
    record_audit(session, current_user, "system", "user.delete", {"deleted_user_id": user_id, "deleted_email": deleted_email})

    return {"message": f"Employee {deleted_email} removed successfully"}
