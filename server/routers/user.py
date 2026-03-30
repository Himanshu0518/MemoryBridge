from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from server.config.db import get_db
from server.core.api_response import ApiResponse
from server.dependencies.auth import verify_token
from server.schemas.user import (
    UserCreatePayload,
    UserLoginPayload,
    UserUpdatePayload,
    ChangePasswordPayload,
)
from server.services.user import (
    createUser,
    loginUser,
    logoutUser,
    refreshAccessTokenForUser,
    verifyCaregiver,
    getMe,
    updateMe,
    changePassword,
    deleteMe,
)

router = APIRouter(prefix="/users", tags=["Users"])


# ── Auth ───────────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=ApiResponse)
def signup(payload: UserCreatePayload, db: Session = Depends(get_db)):
    user = createUser(payload, db)
    return ApiResponse(
        success=True,
        message="Account created successfully",
        data={"id": user.id, "name": user.name, "email": user.email},
    )


@router.post("/login", response_model=ApiResponse)
def login(
    payload: UserLoginPayload,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Login and receive:
    - access_token  (30 days)   — stored in localStorage by frontend
    - refresh_token (90 days)   — stored in localStorage by frontend
    - httpOnly cookie           — fallback for cookie-based auth
    """
    user, access_token, refresh_token = loginUser(payload, db)

    response.set_cookie(
        key="access-token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="Lax",
    )

    return ApiResponse(
        success=True,
        message="Login successful",
        data={
            "id":            user.id,
            "name":          user.name,
            "email":         user.email,
            "role":          user.role,
            "access_token":  access_token,
            "refresh_token": refresh_token,
        },
    )


class RefreshPayload(BaseModel):
    user_id:       int
    refresh_token: str


@router.post("/refresh", response_model=ApiResponse)
def refresh(
    payload: RefreshPayload,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Exchange a valid refresh token for a new access + refresh token pair.
    Frontend calls this automatically when a 401 is received.
    """
    user, new_access, new_refresh = refreshAccessTokenForUser(
        payload.user_id, payload.refresh_token, db
    )

    response.set_cookie(
        key="access-token",
        value=new_access,
        httponly=True,
        secure=False,
        samesite="Lax",
    )

    return ApiResponse(
        success=True,
        message="Token refreshed",
        data={
            "access_token":  new_access,
            "refresh_token": new_refresh,
        },
    )


class VerifyCaregiverPayload(BaseModel):
    email:      EmailStr
    password:   str
    patient_id: int


@router.post("/verify-caregiver", response_model=ApiResponse)
def verify_caregiver_endpoint(
    payload: VerifyCaregiverPayload,
    db: Session = Depends(get_db),
):
    """
    Logout guard: verify that the email+password belong to a caregiver
    who owns the given patient_id before allowing patient-mode exit.
    No auth header required — this is intentionally public for the guard flow.
    """
    verifyCaregiver(payload.email, payload.password, payload.patient_id, db)
    return ApiResponse(success=True, message="Caregiver verified")


@router.post("/logout", response_model=ApiResponse)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    response.delete_cookie("access-token")
    logoutUser(token_data["user_id"], db)
    return ApiResponse(success=True, message="Logged out successfully")


# ── Profile ────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=ApiResponse)
def get_profile(
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    user = getMe(token_data["user_id"], db)
    return ApiResponse(
        success=True,
        message="Profile fetched",
        data={"id": user.id, "name": user.name, "email": user.email, "age": user.age, "role": user.role},
    )


@router.patch("/me", response_model=ApiResponse)
def update_profile(
    payload: UserUpdatePayload,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    user = updateMe(token_data["user_id"], payload, db)
    return ApiResponse(
        success=True,
        message="Profile updated",
        data={"id": user.id, "name": user.name, "email": user.email, "age": user.age, "role": user.role},
    )


@router.patch("/me/change-password", response_model=ApiResponse)
def update_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    changePassword(token_data["user_id"], payload, db)
    return ApiResponse(success=True, message="Password changed successfully")


@router.delete("/me", response_model=ApiResponse)
def delete_account(
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    deleteMe(token_data["user_id"], db)
    return ApiResponse(success=True, message="Account deleted successfully")
