from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from server.services.user import createUser, loginUser
from server.config.db import get_db
from server.schemas.user import UserCreatePayload, UserLoginPayload
from server.core.api_response import ApiResponse
from server.services.patient import createPatient


router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/signup", response_model=ApiResponse)
def create_user(
    payload: UserCreatePayload,
    db: Session = Depends(get_db)
):
    user = createUser(payload, db)

    return ApiResponse(
        success=True,
        message="User created successfully",
        data={
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    )


@router.post("/login", response_model=ApiResponse)
def login_user(
    payload:UserLoginPayload,
    response: Response,
    db: Session = Depends(get_db),
):
    user, access_token = loginUser(payload, db)

    response.set_cookie(
        key="access-token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="Lax"
    )

    return ApiResponse(
        success=True,
        message="Login successful",
        data={
            "email": user.email,
            "access-token": access_token
        }
    )

