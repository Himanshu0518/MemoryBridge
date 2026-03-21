"""
routers/recognition.py
======================
Endpoints:

  POST /recognition/store/{known_person_id}
      Upload a photo of a known person → detects face → stores embedding(s).

  POST /recognition/match/{patient_id}
      Upload a photo → detect face → compare against all known faces
      for this patient → return who it is (or create UnknownFace).

  GET  /recognition/known-persons/{patient_id}
      List all known persons registered for a patient.
"""

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy import true
from sqlalchemy.orm import Session
from server.core.api_response import ApiResponse
from server.core.api_error import ApiError

from server.config.db import get_db
from server.schemas.face import StoreFaceResponse, MatchFaceResponse
from server.services import face_service

router = APIRouter(prefix="/recognition", tags=["Face Recognition"])


@router.post("/store_known_person", response_model=StoreFaceResponse)
async def store_face(
    relation: str = File(..., description="Relation to the patient (e.g. 'daughter')"),
    name: str = File(..., description="Name of the known person (e.g. 'Alice')"),
    patient_id: int = File(..., description="ID of the patient this person is related to"),
    file: UploadFile = File(..., description="Photo of the known person (JPEG/PNG)"),
    db: Session = Depends(get_db),
):
    """
    Upload a photo of a known person.
    The system detects their face and stores the embedding so it can be
    recognised later when they visit the patient.

    - **known_person_id**: the KnownPerson row this photo belongs to
    - **file**: JPEG or PNG image
    """
    image_bytes = await file.read()
    
    
    try:
        records = face_service.addPerson(
            db, patient_id, name, relation, true, image_bytes
        )
    except ValueError as e:
        raise ApiError(status_code=400, message=str(e))

    return ApiResponse(
        message=f"Stored {len(records)} face embedding(s) for known person '{name}' with relation '{relation}' to patient {patient_id}.",
        success=True,
        data=[{"embedding_id": r.id} for r in records]
    )


@router.post("/match/{patient_id}", response_model=MatchFaceResponse)
async def match_face(
    patient_id: int,
    file: UploadFile = File(..., description="Photo captured from camera (JPEG/PNG)"),
    db: Session = Depends(get_db),
):
    """
    Upload a live photo (e.g. from the patient's camera).
    The system:
    1. Detects the face in the photo
    2. Compares it against every stored face for this patient
    3. Returns who it is if recognised, or creates an UnknownFace record

    - **patient_id**: which patient's face database to search
    - **file**: JPEG or PNG image
    """
    image_bytes = await file.read()
    result = face_service.match_face(db, patient_id, image_bytes)
    return MatchFaceResponse(**result)


@router.get("/known-persons/{patient_id}")
def list_known_persons(patient_id: int, db: Session = Depends(get_db)):
    """
    List all known persons registered for a patient, with their names and relations.
    """
    persons = face_service.get_known_persons_for_patient(db, patient_id)
    return [
        {
            "id":       p.id,
            "name":     p.name,
            "relation": p.relation,
        }
        for p in persons
    ]
