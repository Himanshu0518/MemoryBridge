import jwt
from sqlalchemy.orm import Session
from server.models.user import User
from server.schemas.user import UserCreatePayload,UserLoginPayload
from passlib.context import CryptContext
from fastapi import HTTPException,status
from datetime import datetime, timedelta,timezone
from server.config.env import ALGORITHM,ACCESS_TOKEN_EXPIRE_MINUTES,SECRET_KEY

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

def loginUser(payload: UserLoginPayload, db: Session):

    existing_user = db.query(User).filter(User.email == payload.email).first()

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not pwd_context.verify(payload.password, existing_user.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect password"
        )

    access_token_expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    data = {
        "sub": existing_user.email,
        "exp": access_token_expires
    }

    access_token = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

    return existing_user, access_token


