from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from server.config.db import Base


class User(Base):
    """
    User represents an authenticated account in the system.

    Roles: caregiver | doctor | admin | patient
    One User manages multiple Patient profiles.
    """

    __tablename__ = "users"

    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String, nullable=False, index=True)
    email    = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    age      = Column(Integer, nullable=True)
    role     = Column(String, default="caregiver", nullable=False)

    # Hashed refresh token — stored so we can invalidate it on logout/password change
    refresh_token_hash = Column(String, nullable=True)

    patients = relationship(
        "Patient",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<User(name={self.name}, email={self.email}, role={self.role})>"
