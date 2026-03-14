from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from server.services.user import createUser
from server.config.db import get_db
from server.schemas.user import UserCreatePayload, UserCreateResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserCreateResponse)
def create_user(
    payload: UserCreatePayload,
    db: Session = Depends(get_db)
):
    return createUser(payload, db)