from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, func
from sqlalchemy.orm import relationship
from server.config.db import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)

    started_at = Column(DateTime, server_default=func.now(), nullable=False)
    ended_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="conversations")
    person = relationship("Person")
    transcripts = relationship("Transcript", back_populates="conversation", cascade="all, delete-orphan")
    summary = relationship("Summary", back_populates="conversation", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Conversation(id={self.id}, patient_id={self.patient_id})>"


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)

    speaker = Column(String, nullable=True)   # "patient" or "visitor"
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="transcripts")

    def __repr__(self):
        return f"<Transcript(id={self.id}, speaker={self.speaker})>"


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, unique=True)

    text = Column(Text, nullable=False)
    generated_at = Column(DateTime, server_default=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="summary")

    def __repr__(self):
        return f"<Summary(id={self.id}, conversation_id={self.conversation_id})>"
