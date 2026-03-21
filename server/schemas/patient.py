from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CreatePatientRequest(BaseModel):
    """
    Payload used when caregiver creates a new patient.
    """

    owner_id: int
    name: str
    age: Optional[int] = None
    diagnosis_level: Optional[str] = None


class PatientResponse(BaseModel):
    """
    Response schema for returning patient data.
    """

    id: int
    owner_id: int
    name: str
    age: Optional[int]
    diagnosis_level: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True