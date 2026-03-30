import jwt
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from server.models.patient import Patient
from server.config.env import SECRET_KEY, ALGORITHM, PATIENT_SESSION_EXPIRE_MINUTES


def _get_patient_or_403(patient_id: int, caregiver_id: int, db: Session) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.owner_id != caregiver_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return patient


def _make_patient_token(patient: Patient, caregiver_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=PATIENT_SESSION_EXPIRE_MINUTES)
    payload = {
        "role":         "patient_viewer",
        "patient_id":   patient.id,
        "patient_name": patient.name,
        "caregiver_id": caregiver_id,
        "exp":          expires,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_patient_session(
    caregiver_id: int,
    patient_id: int,
    db: Session,
) -> tuple[Patient, str]:
    patient = _get_patient_or_403(patient_id, caregiver_id, db)
    token   = _make_patient_token(patient, caregiver_id)
    return patient, token
