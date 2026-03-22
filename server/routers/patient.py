from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from server.config.db import get_db
from server.core.api_response import ApiResponse
from server.dependencies.auth import verify_token
from server.schemas.patient import (
    CreatePatientRequest,
    UpdatePatientRequest,
    PatientResponse,
    CreatePersonRequest,
    UpdatePersonRequest,
    PersonResponse,
)
from server.services.patient import (
    createPatient,
    getMyPatients,
    getPatientById,
    updatePatient,
    deletePatient,
    createPerson,
    getPersonsForPatient,
    getPersonById,
    updatePerson,
    deletePerson,
)

router = APIRouter(tags=["Patients"])


# ════════════════════════════════════════════════════════════════════════════════
#  PATIENT ROUTES   /patients
# ════════════════════════════════════════════════════════════════════════════════

@router.post("/patients", response_model=ApiResponse)
def create_patient(
    payload: CreatePatientRequest,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Create a new patient profile owned by the logged-in caregiver."""
    patient = createPatient(db, payload, owner_id=token_data["user_id"])
    return ApiResponse(
        success=True,
        message="Patient created successfully",
        data=PatientResponse.model_validate(patient).model_dump(),
    )


@router.get("/patients", response_model=ApiResponse)
def list_patients(
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Get all patient profiles owned by the logged-in caregiver."""
    patients = getMyPatients(owner_id=token_data["user_id"], db=db)
    return ApiResponse(
        success=True,
        message="Patients fetched",
        data=[PatientResponse.model_validate(p).model_dump() for p in patients],
    )


@router.get("/patients/{patient_id}", response_model=ApiResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Get a single patient profile by ID."""
    patient = getPatientById(patient_id, owner_id=token_data["user_id"], db=db)
    return ApiResponse(
        success=True,
        message="Patient fetched",
        data=PatientResponse.model_validate(patient).model_dump(),
    )


@router.patch("/patients/{patient_id}", response_model=ApiResponse)
def update_patient(
    patient_id: int,
    payload: UpdatePatientRequest,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Update a patient's name, age, or diagnosis level."""
    patient = updatePatient(patient_id, owner_id=token_data["user_id"], payload=payload, db=db)
    return ApiResponse(
        success=True,
        message="Patient updated",
        data=PatientResponse.model_validate(patient).model_dump(),
    )


@router.delete("/patients/{patient_id}", response_model=ApiResponse)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Delete a patient profile and all their associated data."""
    deletePatient(patient_id, owner_id=token_data["user_id"], db=db)
    return ApiResponse(success=True, message="Patient deleted successfully")


# ════════════════════════════════════════════════════════════════════════════════
#  PERSON ROUTES   /patients/{patient_id}/persons
#  (known persons and unknown faces linked to a patient)
# ════════════════════════════════════════════════════════════════════════════════

@router.post("/patients/{patient_id}/persons", response_model=ApiResponse)
def create_person(
    patient_id: int,
    payload: CreatePersonRequest,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """
    Register a new known person for a patient.
    e.g. name='Rahul Singh', relation='son', is_known=True
    """
    person = createPerson(patient_id, owner_id=token_data["user_id"], payload=payload, db=db)
    return ApiResponse(
        success=True,
        message="Person registered successfully",
        data=PersonResponse.model_validate(person).model_dump(),
    )


@router.get("/patients/{patient_id}/persons", response_model=ApiResponse)
def list_persons(
    patient_id: int,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """List all persons (known and unknown) associated with a patient."""
    persons = getPersonsForPatient(patient_id, owner_id=token_data["user_id"], db=db)
    return ApiResponse(
        success=True,
        message="Persons fetched",
        data=[PersonResponse.model_validate(p).model_dump() for p in persons],
    )


@router.get("/patients/{patient_id}/persons/{person_id}", response_model=ApiResponse)
def get_person(
    patient_id: int,
    person_id: int,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Get a single person by ID."""
    person = getPersonById(patient_id, person_id, owner_id=token_data["user_id"], db=db)
    return ApiResponse(
        success=True,
        message="Person fetched",
        data=PersonResponse.model_validate(person).model_dump(),
    )


@router.patch("/patients/{patient_id}/persons/{person_id}", response_model=ApiResponse)
def update_person(
    patient_id: int,
    person_id: int,
    payload: UpdatePersonRequest,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """
    Update a person's details.
    Also used to convert an unknown face → known person by setting
    is_known=True and providing name and relation.
    """
    person = updatePerson(patient_id, person_id, owner_id=token_data["user_id"], payload=payload, db=db)
    return ApiResponse(
        success=True,
        message="Person updated",
        data=PersonResponse.model_validate(person).model_dump(),
    )


@router.delete("/patients/{patient_id}/persons/{person_id}", response_model=ApiResponse)
def delete_person(
    patient_id: int,
    person_id: int,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Delete a person and all their face embeddings."""
    deletePerson(patient_id, person_id, owner_id=token_data["user_id"], db=db)
    return ApiResponse(success=True, message="Person deleted successfully")
