from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from server.config.db import Base

class Patient(Base):
    """
    Patient represents the Alzheimer patient profile.

    Core entity of MemoryBridge.

    Everything important belongs to a patient:
    - known persons
    - unknown faces
    - embeddings
    - future conversations
    """

    __tablename__ = "patients"

    id = Column(Integer, primary_key=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)

    age = Column(Integer, nullable=True)

    diagnosis_level = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    owner = relationship("User", back_populates="patients")

    persons = relationship(
        "Person",
        back_populates="patient",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Patient(name={self.name}, user_id={self.user_id})>"