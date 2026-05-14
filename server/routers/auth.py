from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from server.config.db import get_db
from server.core.api_response import ApiResponse
from server.dependencies.auth import verify_token
from server.services.auth import create_patient_session

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/patient-session/exit", response_model=ApiResponse)
def exit_patient(response: Response):
    """
    Exit the patient session and return to caregiver context.
    Clears the patient-token cookie — no auth required (safe to call even if token expired).
    """
    response.delete_cookie("patient-token")
    return ApiResponse(
        success=True,
        message="Exited patient session",
    )


@router.post("/patient-session/{patient_id}", response_model=ApiResponse)
def switch_to_patient(
    patient_id: int,
    response: Response,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """
    Caregiver switches context into a patient session.

    - Verifies the caregiver owns the patient.
    - Returns a short-lived patient-scoped JWT (also set as httpOnly cookie).
    - Frontend switches to patient UI using this token.
    - The caregiver's original token is untouched — they return to it on exit.
    """
    if token_data.get("role") not in ("caregiver", "admin"):
        raise HTTPException(status_code=403, detail="Only caregivers can open a patient session")

    patient, patient_token = create_patient_session(
        caregiver_id=token_data["user_id"],
        patient_id=patient_id,
        db=db,
    )

    response.set_cookie(
        key="patient-token",
        value=patient_token,
        httponly=True,
        secure=False,   # set True in production (HTTPS)
        samesite="Lax",
    )

    return ApiResponse(
        success=True,
        message=f"Patient session started for {patient.name}",
        data={
            "patient_id":       patient.id,
            "patient_name":     patient.name,
            "patient_token":    patient_token,
            "diagnosis_level":  patient.diagnosis_level,
        },
    )
