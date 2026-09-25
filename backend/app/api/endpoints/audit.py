from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, desc
from app.db.session import get_session
from app.db.models import User, AuditEntry
from app.core.permissions import can
from app.api.deps import get_current_user

router = APIRouter()

@router.get("")
def get_audit_logs(
    patient_id: Optional[str] = Query(None, description="Filter logs by patient ID"),
    user_email: Optional[str] = Query(None, description="Filter logs by user email"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "audit.view"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: compliance audit logs are restricted to Administrator accounts."
        )

    statement = select(AuditEntry).order_by(desc(AuditEntry.createdAt))
    
    if patient_id:
        statement = statement.where(AuditEntry.patientId == patient_id)
    if user_email:
        statement = statement.where(AuditEntry.userEmail == user_email)

    statement = statement.limit(limit)
    entries = session.exec(statement).all()

    formatted_entries = []
    for e in entries:
        formatted_entries.append({
            "id": e.id,
            "userId": e.userId,
            "userEmail": e.userEmail,
            "userName": e.userName,
            "userRole": e.userRole,
            "patientId": e.patientId,
            "action": e.action,
            "detail": e.get_detail(),
            "createdAt": e.createdAt.isoformat()
        })

    return {"audit_entries": formatted_entries}
