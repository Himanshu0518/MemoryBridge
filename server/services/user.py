import jwt
import secrets
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
from server.config.env import (
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_MINUTES,
    SECRET_KEY,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── helpers ────────────────────────────────────────────────────────────────────

def _get_user_or_404(user_id: int, db: Session) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _make_access_token(user: User) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub":     user.email,
        "user_id": user.id,
        "role":    user.role,
        "exp":     expires,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _make_refresh_token(user: User) -> str:
    """
    Refresh token: opaque random string (not JWT).
    We store its hash in the DB so we can validate + rotate on use.
    """
    return secrets.token_urlsafe(48)


def _hash_token(raw: str) -> str:
    """Bcrypt-hash an opaque token for safe storage."""
    return pwd_context.hash(raw)


def _verify_hashed_token(raw: str, hashed: str) -> bool:
    return pwd_context.verify(raw, hashed)


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


def loginUser(payload: UserLoginPayload, db: Session) -> tuple[User, str, str]:
    """
    Validate credentials and return (user, access_token, refresh_token).
    The refresh token is stored hashed in the DB.
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not pwd_context.verify(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token  = _make_access_token(user)
    refresh_token = _make_refresh_token(user)

    # Store hashed refresh token (rotate every login)
    user.refresh_token_hash = _hash_token(refresh_token)
    db.commit()

    return user, access_token, refresh_token


def refreshAccessToken(refresh_token: str, db: Session) -> tuple[User, str, str]:
    """
    Validate the refresh token, rotate it, and return a new access + refresh token pair.
    Called by the frontend when the access token has expired.
    """
    # We can't look up by token value alone (it's hashed), so the frontend must
    # also send the user_id claim. We decode it from the raw token payload instead
    # by finding the user whose stored hash matches.
    #
    # Strategy: frontend sends { user_id, refresh_token } in the body.
    # This function receives just the refresh_token — caller passes user_id separately.
    raise NotImplementedError("Call refreshAccessTokenForUser instead")


def refreshAccessTokenForUser(user_id: int, refresh_token: str, db: Session) -> tuple[User, str, str]:
    """
    Frontend sends: { user_id, refresh_token }
    We look up the user, verify the hashed token, then rotate both tokens.
    """
    user = _get_user_or_404(user_id, db)

    if not user.refresh_token_hash:
        raise HTTPException(status_code=401, detail="No refresh token stored. Please log in again.")

    if not _verify_hashed_token(refresh_token, user.refresh_token_hash):
        # Possible token theft — invalidate stored token
        user.refresh_token_hash = None
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid refresh token. Please log in again.")

    # Rotate both tokens
    new_access  = _make_access_token(user)
    new_refresh = _make_refresh_token(user)
    user.refresh_token_hash = _hash_token(new_refresh)
    db.commit()

    return user, new_access, new_refresh


def verifyCaregiver(email: str, password: str, patient_id: int, db: Session) -> bool:
    """
    Used by the logout guard: verify that the provided credentials belong to
    a caregiver who owns the given patient_id.
    Returns True if valid, raises 401/403 otherwise.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    from server.models.patient import Patient
    patient = db.get(Patient, patient_id)
    if not patient or patient.owner_id != user.id:
        raise HTTPException(status_code=403, detail="This patient does not belong to your account")

    return True


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
    # Invalidate refresh token on password change
    user.refresh_token_hash = None
    db.commit()


def logoutUser(user_id: int, db: Session) -> None:
    """Invalidate the stored refresh token on logout."""
    user = _get_user_or_404(user_id, db)
    user.refresh_token_hash = None
    db.commit()


def deleteMe(user_id: int, db: Session) -> None:
    user = _get_user_or_404(user_id, db)
    db.delete(user)
    db.commit()
