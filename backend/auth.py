import hashlib
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from pwdlib import PasswordHash
from sqlalchemy import text

from backend.database import engine

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is missing from .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(prefix="/auth", tags=["Authentication"])
password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class UserCreate(BaseModel):
    username: str
    password: str

def create_access_token(username: str, role: str):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": username,
        "role": role,
        "exp": expire
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/register")
def register_user(user: UserCreate):
    if len(user.username.strip()) == 0:
        raise HTTPException(
            status_code=400,
            detail="Username cannot be empty"
        )

    if len(user.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long"
        )

    hashed_password = password_hash.hash(user.password)

    with engine.begin() as connection:
        existing_user = connection.execute(
            text("""
                SELECT id FROM users
                WHERE username = :username
            """),
            {"username": user.username}
        ).fetchone()

        if existing_user is not None:
            raise HTTPException(
                status_code=409,
                detail="Username already exists"
            )

        result = connection.execute(
            text("""
                INSERT INTO users (username, password_hash, role)
                VALUES (:username, :password_hash, :role)
            """),
            {
                "username": user.username,
                "password_hash": hashed_password,
                "role": "pharmacist"
            }
        )

        user_id = result.lastrowid

    return {
        "message": "User registered successfully",
        "user_id": user_id,
        "username": user.username,
        "role": "pharmacist"
    }

@router.post("/login")
def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT id, username, password_hash, role
                FROM users
                WHERE username = :username
            """),
            {"username": form_data.username}
        )

        user = result.fetchone()

    if user is None or not password_hash.verify(
        form_data.password, user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(user.username, user.role)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")
        role = payload.get("role")
        expires_at = payload.get("exp")

        if not username or not role or expires_at is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        # Check whether this token has been revoked
        with engine.connect() as connection:
            revoked = connection.execute(
                text("""
                    SELECT id
                    FROM revoked_tokens
                    WHERE token_hash = :token_hash
                """),
                {"token_hash": hash_token(token)}
            ).fetchone()

        if revoked is not None:
            raise HTTPException(
                status_code=401,
                detail="Token has been revoked"
            )

        return {
            "username": username,
            "role": role
        }

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    current_user: dict = Depends(get_current_user)
):
    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )

    expires_at = datetime.fromtimestamp(
        payload["exp"],
        tz=timezone.utc
    ).replace(tzinfo=None)

    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO revoked_tokens (token_hash, expires_at)
                VALUES (:token_hash, :expires_at)
            """),
            {
                "token_hash": hash_token(token),
                "expires_at": expires_at
            }
        )

    return {"message": "Logged out successfully"}
    
@router.get("/me")
def read_current_user(
    current_user: dict = Depends(get_current_user)
):
    return current_user

def require_role(*allowed_roles):
    def role_checker(
        current_user: dict = Depends(get_current_user)
    ):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to perform this action"
            )

        return current_user

    return role_checker

