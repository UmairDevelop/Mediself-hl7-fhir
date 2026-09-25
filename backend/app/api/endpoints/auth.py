from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import jwt
from sqlmodel import Session, select
from app.config import settings
from app.db.session import get_session, verify_password
from app.db.models import User

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_payload = {"sub": user.email, "exp": expire, "role": user.role.value}
    token = jwt.encode(token_payload, settings.JWT_SECRET, algorithm=settings.ALGORITHM)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role.value
        )
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_session)):
    from app.api.deps import get_current_user
    # Handled via current user injection
    pass
