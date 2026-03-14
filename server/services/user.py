from sqlalchemy.orm import Session
from server.models.user import User
from server.schemas.user import UserCreatePayload


def createUser(payload: UserCreatePayload, db: Session):
    user = User(
        name=payload.name,
        email=payload.email,
        password=payload.password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user