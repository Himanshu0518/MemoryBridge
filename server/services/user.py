from sqlalchemy.orm import Session
from server.models.user import User
from server.schemas.user import UserCreatePayload
from passlib.context import CryptContext
from fastapi import HTTPException

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def createUser(payload: UserCreatePayload, db: Session):

    existing_user = db.query(User).filter(User.email == payload.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = pwd_context.hash(payload.password)

    user = User(
        name=payload.name,
        email=payload.email,
        password=hashed_password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user