from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json
from sqlmodel import SQLModel, Field

class Role(str, Enum):
    PHYSICIAN = "PHYSICIAN"
    NURSE = "NURSE"
    FRONT_DESK = "FRONT_DESK"
    ADMIN = "ADMIN"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    name: str
    role: Role

class AuditEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    userId: int = Field(index=True)
    userEmail: str
    userName: str
    userRole: str
    patientId: str = Field(index=True)
    action: str = Field(index=True)  # e.g. "condition.create", "chat.question"
    detail: str = Field(default="{}")  # JSON encoded string
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def set_detail(self, data: Dict[str, Any]):
        self.detail = json.dumps(data)

    def get_detail(self) -> Dict[str, Any]:
        try:
            return json.loads(self.detail)
        except Exception:
            return {}

class ApiUsageLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    userId: int = Field(index=True)
    userEmail: str
    userName: str
    patientId: str = Field(index=True)
    modelName: str  # e.g. "gemini-2.5-flash" or "local-clinical-engine"
    promptTokens: int = Field(default=0)
    candidateTokens: int = Field(default=0)
    totalTokens: int = Field(default=0)
    latencyMs: float = Field(default=0.0)
    status: str = Field(default="success")  # "success" or "error"
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SystemSetting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True)
    value: str
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
