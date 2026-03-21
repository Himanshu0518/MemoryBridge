from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from server.config.db import get_db
from server.core.api_response import ApiResponse
from server.services.patient import createPatient

from server.schemas.patient import CreatePatientRequest, PatientResponse


router = APIRouter(prefix="/patients", tags=["Patients"])



@router.post("/create-patient", response_model=ApiResponse)
def create_patient(
    payload: CreatePatientRequest,
    db: Session = Depends(get_db)
):
    patient = createPatient(
        db,
        payload
    )

    return ApiResponse(
        success=True,
        message="Patient profile created successfully",
        data=PatientResponse.model_validate(patient)
    )