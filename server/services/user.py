import jwt
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone

from server.models.user import User
from server.schemas.user import (
    UserCreatePayload,
    UserLoginPayload,
    UserUpdatePayload,
    ChangePasswordPayload,
)
from server.config.env import ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── helpers ────────────────────────────────────────────────────────────────────

def _get_user_or_404(user_id: int, db: Session) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _make_token(user: User) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user.email,
        "user_id": user.id,
        "role": user.role,
        "exp": expires,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── public service functions ───────────────────────────────────────────────────

def createUser(payload: UserCreatePayload, db: Session) -> User:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password=pwd_context.hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def loginUser(payload: UserLoginPayload, db: Session):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not pwd_context.verify(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    return user, _make_token(user)


def getMe(user_id: int, db: Session) -> User:
    return _get_user_or_404(user_id, db)


def updateMe(user_id: int, payload: UserUpdatePayload, db: Session) -> User:
    user = _get_user_or_404(user_id, db)

    if payload.name is not None:
        user.name = payload.name
    if payload.age is not None:
        user.age = payload.age

    db.commit()
    db.refresh(user)
    return user


def changePassword(user_id: int, payload: ChangePasswordPayload, db: Session) -> None:
    user = _get_user_or_404(user_id, db)

    if not pwd_context.verify(payload.current_password, user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.password = pwd_context.hash(payload.new_password)
    db.commit()


def deleteMe(user_id: int, db: Session) -> None:
    user = _get_user_or_404(user_id, db)
    db.delete(user)
    db.commit()
