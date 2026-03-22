from fastapi import APIRouter, Depends, Response
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
    getMe,
    updateMe,
    changePassword,
    deleteMe,
)

router = APIRouter(prefix="/users", tags=["Users"])


# ── Auth ───────────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=ApiResponse)
def signup(payload: UserCreatePayload, db: Session = Depends(get_db)):
    """Register a new caregiver account."""
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
    """Login and receive a JWT token (also set as httpOnly cookie)."""
    user, token = loginUser(payload, db)

    response.set_cookie(
        key="access-token",
        value=token,
        httponly=True,
        secure=False,       # set True in production (HTTPS)
        samesite="Lax",
    )

    return ApiResponse(
        success=True,
        message="Login successful",
        data={"id": user.id, "email": user.email, "role": user.role, "access-token": token},
    )


@router.post("/logout", response_model=ApiResponse)
def logout(response: Response, token_data: dict = Depends(verify_token)):
    """Logout — clears the auth cookie."""
    response.delete_cookie("access-token")
    return ApiResponse(success=True, message="Logged out successfully")


# ── Profile ────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=ApiResponse)
def get_profile(
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Get the logged-in user's profile."""
    user = getMe(token_data["user_id"], db)
    return ApiResponse(
        success=True,
        message="Profile fetched",
        data={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "age": user.age,
            "role": user.role,
        },
    )


@router.patch("/me", response_model=ApiResponse)
def update_profile(
    payload: UserUpdatePayload,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Update name or age of the logged-in user."""
    user = updateMe(token_data["user_id"], payload, db)
    return ApiResponse(
        success=True,
        message="Profile updated",
        data={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "age": user.age,
            "role": user.role,
        },
    )


@router.patch("/me/change-password", response_model=ApiResponse)
def update_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Change the logged-in user's password."""
    changePassword(token_data["user_id"], payload, db)
    return ApiResponse(success=True, message="Password changed successfully")


@router.delete("/me", response_model=ApiResponse)
def delete_account(
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Permanently delete the logged-in user's account and all their patients."""
    deleteMe(token_data["user_id"], db)
    return ApiResponse(success=True, message="Account deleted successfully")
