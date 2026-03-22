from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from server.config.db import get_db
from server.core.api_error import ApiError
from server.schemas.face import StoreFaceResponse, MatchFaceResponse
from server.services import face_service
from server.dependencies.auth import verify_token

router = APIRouter(prefix="/recognition", tags=["Face Recognition"])


@router.post("/store_known_face", response_model=StoreFaceResponse)
async def store_face(
    patient_id: int = Form(..., description="ID of the patient this person belongs to"),
    name: str = Form(..., description="Full name of the person, e.g. 'Rahul Singh'"),
    relation: str = Form(..., description="Relation to patient, e.g. 'son'"),
    file: UploadFile = File(..., description="Photo of the person (JPEG/PNG)"),
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """
    Register a known person for a patient by uploading their photo.

    - Detects the face in the photo
    - Generates a 512-d embedding
    - Stores both the Person record and the FaceEmbedding in the database

    Send as multipart/form-data with fields: patient_id, name, relation, file.
    """
    image_bytes = await file.read()

    try:
        person, embeddings = face_service.addPerson(
            db, patient_id, name, relation, True, image_bytes
        )
    except ValueError as e:
        raise ApiError(status_code=400, message=str(e))

    return StoreFaceResponse(
        success=True,
        message=f"Registered '{name}' ({relation}) with {len(embeddings)} face embedding(s).",
        data={
            "person_id":        person.id,
            "name":             person.name,
            "relation":         person.relation,
            "is_known":         person.is_known,
            "embeddings_stored": len(embeddings),
            "embedding_ids":    [e.id for e in embeddings],
        },
    )


@router.post("/match/{patient_id}", response_model=MatchFaceResponse)
async def match_face(
    patient_id: int,
    file: UploadFile = File(..., description="Live photo from camera (JPEG/PNG)"),
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """
    Identify who is in a photo by comparing against all stored faces for a patient.

    - **recognised = True**  → returns person name, relation, and similarity score
    - **recognised = False** → creates an UnknownFace record and returns its ID
    - **error = no_face_detected** → no face found in the image
    """
    image_bytes = await file.read()
    result = face_service.match_face(db, patient_id, image_bytes)

    if result.get("error") == "no_face_detected":
        return MatchFaceResponse(
            success=False,
            message="No face detected in the uploaded image.",
            data={"error": "no_face_detected"},
        )

    if result["recognised"]:
        return MatchFaceResponse(
            success=True,
            message=f"Recognised as {result['name']} ({result['relation']}).",
            data=result,
        )

    return MatchFaceResponse(
        success=False,
        message="Face not recognised. Saved as unknown face.",
        data=result,
    )


@router.get("/known-persons/{patient_id}")
def list_known_persons(
    patient_id: int,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """List all known persons registered for a patient."""
    persons = face_service.get_known_persons_for_patient(db, patient_id)
    return {
        "success": True,
        "message": "Known persons fetched",
        "data": [
            {
                "id":       p.id,
                "name":     p.name,
                "relation": p.relation,
            }
            for p in persons
        ],
    }


@router.post("/store_unknown_face/{patient_id}")
async def store_unknown_face(
    patient_id: int,
    file: UploadFile = File(..., description="Photo of the unknown person (JPEG/PNG)"),
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Store an unknown face for a patient (used when matching fails)."""
    image_bytes = await file.read()

    try:
        person, embeddings = face_service.addPerson(
            db, patient_id, None, None, False, image_bytes
        )
    except ValueError as e:
        raise ApiError(status_code=400, message=str(e))

    return StoreFaceResponse(
        success=True,
        message=f"Registered unknown face with {len(embeddings)} face embedding(s).",
        data={
            "person_id":        person.id,
            "name":             person.name,
            "relation":         person.relation,
            "is_known":         person.is_known,
            "embeddings_stored": len(embeddings),
            "embedding_ids":    [e.id for e in embeddings],
        },
    )