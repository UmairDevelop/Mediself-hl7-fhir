from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session
from app.db.session import get_session
from app.db.models import User, AuditEntry
from app.core.permissions import can
from app.api.deps import get_current_user
from app.services.gemini_service import answer_patient_question

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

@router.post("/{id}/chat")
async def chat_with_patient_ai(
    id: str,
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not can(current_user, "chat.use"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: your role does not have permission to use the AI chat assistant."
        )

    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # Execute AI orchestration strictly scoped to `id` with token usage tracking
    result = await answer_patient_question(
        patient_id=id,
        question=payload.question,
        user_id=current_user.id or 0,
        user_email=current_user.email,
        user_name=current_user.name,
        db_session=session
    )

    # Record Audit entry
    entry = AuditEntry(
        userId=current_user.id,
        userEmail=current_user.email,
        userName=current_user.name,
        userRole=current_user.role.value,
        patientId=id,
        action="chat.question"
    )
    entry.set_detail({
        "question": payload.question,
        "citations": result.get("citations", [])
    })
    session.add(entry)
    session.commit()

    return result
