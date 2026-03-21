from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from server.config.db import Base


class User(Base):
    """
    User represents an authenticated account in the system.

    This table stores people who can log into MemoryBridge, such as:
    - caregiver
    - doctor
    - admin
    - patient (optional later)

    Important:
    A User is not necessarily someone recognized by face detection.
    Face-recognized identities are stored in Person table.

    Relationship:
    One User can manage multiple Patient profiles.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False, index=True)

    email = Column(String, unique=True, nullable=False, index=True)

    password = Column(String, nullable=False)

    age = Column(Integer, nullable=True)

    role = Column(String, default="caregiver", nullable=False)
    # possible values:
    # caregiver, doctor, admin, patient

    patients = relationship(
        "Patient",
        back_populates="owner",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User(name={self.name}, email={self.email}, role={self.role})>"