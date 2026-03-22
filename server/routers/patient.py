from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from server.config.db import get_db
from server.core.api_response import ApiResponse
from server.core.api_error import ApiError
from server.services.patient import createPatient
from server.dependencies.auth import verify_token
from server.schemas.patient import CreatePatientRequest, PatientResponse


router = APIRouter(prefix="/patients", tags=["Patients"])



@router.post("/create-patient", response_model=ApiResponse)
def create_patient(
    payload: CreatePatientRequest,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token)
):
    
    if token_data is None:
        raise ApiError(status_code=401, message="Unauthorized: No valid token provided")
    
    try:
        owner_id = token_data.get("user_id")
        if owner_id is None:
            raise ApiError(status_code=401, message="Unauthorized: Token missing user_id")
        
        patient = createPatient(
            db,
            payload,
            owner_id
        )
    
        return ApiResponse(
        success=True,
        message="Patient profile created successfully",
        data=PatientResponse.model_validate(patient)
        )
    except Exception as e:
        raise ApiError(status_code=500, message=f"Failed to create patient profile: {str(e)}")

