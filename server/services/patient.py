from sqlalchemy.orm import Session
from server.models.patient import Patient
from server.schemas.patient import CreatePatientRequest


def createPatient(db: Session, payload: CreatePatientRequest) -> Patient:
    """
    Create a new patient profile under one owner user.
    """

    try:
        new_patient = Patient(
            name=payload.name,
            owner_id=payload.owner_id,
            age=payload.age,
            diagnosis_level=payload.diagnosis_level
        )

        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)

        return new_patient

    except Exception as e:
        db.rollback()
        raise e