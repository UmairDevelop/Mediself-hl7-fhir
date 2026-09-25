import hashlib
import secrets
from sqlmodel import SQLModel, create_engine, Session, select
from app.config import settings
from app.db.models import User, Role

connect_args = {"check_same_thread": False}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

def hash_password(password: str) -> str:
    # Use SHA-256 with salt for simple, robust hashing without passlib legacy bugs
    salt = "mediself_clinical_salt_2026"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    expected_hash = hash_password(plain_password)
    return secrets.compare_digest(expected_hash, hashed_password)

def init_db():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Seed default users if empty
        existing_users = session.exec(select(User)).first()
        if not existing_users:
            default_users = [
                User(
                    email="physician@hospital.org",
                    name="Dr. Sarah Connor, MD",
                    password_hash=hash_password("doctor123"),
                    role=Role.PHYSICIAN,
                ),
                User(
                    email="nurse@hospital.org",
                    name="Nurse James Wilson, RN",
                    password_hash=hash_password("nurse123"),
                    role=Role.NURSE,
                ),
                User(
                    email="frontdesk@hospital.org",
                    name="Alex Rivera (Front Desk)",
                    password_hash=hash_password("frontdesk123"),
                    role=Role.FRONT_DESK,
                ),
                User(
                    email="admin@hospital.org",
                    name="Administrator (IT/Compliance)",
                    password_hash=hash_password("admin123"),
                    role=Role.ADMIN,
                ),
            ]
            session.add_all(default_users)
            session.commit()

def get_session():
    with Session(engine) as session:
        yield session
