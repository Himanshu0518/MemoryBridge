"""
face_service.py
===============
Handles:
  • Storing face embeddings for a KnownPerson
  • Matching an incoming face against all stored embeddings for a patient
  • Creating UnknownFace records when no match is found

Matching strategy:
    We use cosine similarity.  Because every stored embedding is L2-normalised
    in face_pipeline.get_embedding(), cosine similarity reduces to a simple
    dot product:   similarity = embedding_a · embedding_b
    A score ≥ MATCH_THRESHOLD means "same person".
"""

from sqlalchemy.orm import Session
import numpy as np

from server.models.person import Person, FaceEmbedding
from server.ai.face_pipeline import extract_embeddings

# ── tuneable constant ──────────────────────────────────────────────────────────
# Cosine similarity threshold. Scores above this → recognised person.
# 0.75 is a reasonable starting point for FaceNet/VGGFace2.
# Raise it (→ 0.85) to be stricter; lower it (→ 0.60) to be more lenient.
MATCH_THRESHOLD = 0.75


# ── helpers ────────────────────────────────────────────────────────────────────

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """
    Dot product of two L2-normalised vectors = cosine similarity.
    Both vectors are already normalised by face_pipeline.get_embedding().
    """
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    return float(np.dot(va, vb))


def _all_embeddings_for_patient(db: Session, patient_id: int) -> list[dict]:
    """
    Load all face embeddings belonging to one patient.

    Traversal:
    FaceEmbedding -> Person -> Patient

    Returns simplified dict list for matching logic.
    """

    rows = (
        db.query(FaceEmbedding, Person)
        .join(Person, FaceEmbedding.person_id == Person.id)
        .where(Person.patient_id == patient_id)
        .all()
    )

    return [
        {
            "embedding_id": face_embed.id,
            "person_id": person.id,
            "name": person.name,
            "relation": person.relation,
            "is_known": person.is_known,
            "embedding": face_embed.embedding,
        }
        for face_embed, person in rows
    ] 

# ── public API ─────────────────────────────────────────────────────────────────

def store_face_embeddings_for_person(
    db: Session,
    person_id: int,
    image_bytes: bytes,
) -> list[FaceEmbedding]:
    """
    Detect all faces in uploaded image and store embeddings
    for one existing Person.

    Used after:
    - caregiver creates known person manually
    - unknown person is created automatically

    One person may receive multiple embeddings from one image
    if multiple face crops are extracted.
    """

    faces = extract_embeddings(image_bytes)

    if not faces:
        raise ValueError("No face detected in uploaded image.")

    created = []

    for face in faces:
        record = FaceEmbedding(
            person_id=person_id,
            embedding=face["embedding"]
        )

        db.add(record)
        created.append(record)

    db.commit()

    for record in created:
        db.refresh(record)

    return created


def match_face(
    db: Session,
    patient_id: int,
    image_bytes: bytes,
) -> dict:
    """
    Detect the face in `image_bytes` and compare it against every stored
    KnownPerson embedding for this patient.

    Returns a dict describing the best match:

    If recognised (similarity ≥ MATCH_THRESHOLD):
        {
            "recognised":   True,
            "known_person_id":       int,
            "known_person_name":     str,
            "known_person_relation": str,
            "similarity":            float,
            "confidence":            float,   # MTCNN detection confidence
        }

    If NOT recognised (similarity < threshold):
        {
            "recognised":     False,
            "similarity":     float,          # best score found (for debugging)
            "confidence":     float,
            "unknown_face_id": int,           # newly created UnknownFace record
        }

    If no face detected:
        {
            "recognised": False,
            "error":      "no_face_detected",
        }
    """
    faces = extract_embeddings(image_bytes)
    if not faces:
        return {"recognised": False, "error": "no_face_detected"}

    # Use the highest-confidence detection (most prominent face)
    face = max(faces, key=lambda f: f["confidence"])
    query_embedding = face["embedding"]
    detection_confidence = face["confidence"]

    # ── compare against every stored embedding for this patient ───────────────
    stored = _all_embeddings_for_patient(db, patient_id)

    best_score = -1.0
    best_match = None

    for record in stored:
        score = _cosine_similarity(query_embedding, record["embedding"])
        if score > best_score:
            best_score = score
            best_match = record

    # ── decision ──────────────────────────────────────────────────────────────
    if best_match and best_score >= MATCH_THRESHOLD:
        return {
            "recognised":            True,
            "known_person_id":       best_match["known_person_id"],
            "known_person_name":     best_match["known_person_name"],
            "known_person_relation": best_match["known_person_relation"],
            "similarity":            best_score,
            "confidence":            detection_confidence,
        }

    # Not recognised → create an UnknownFace record and store the embedding
    unknown_face = Person(patient_id=patient_id, name=None, relation=None, is_known=False)
    db.add(unknown_face)
    db.flush()   # populate unknown_face.id without committing yet

    unknown_embedding = FaceEmbedding(
        person_id=unknown_face.id,
        embedding=query_embedding,
    )
    db.add(unknown_embedding)
    db.commit()
    db.refresh(unknown_face)

    return {
        "recognised":      False,
        "similarity":      best_score,
        "confidence":      detection_confidence,
        "unknown_face_id": unknown_face.id,
    }


def get_known_persons_for_patient(db: Session, patient_id: int) -> list:
    """Return all KnownPersons for a patient (used by the router)."""

    return db.query(Person).filter(
        Person.patient_id == patient_id,
        Person.is_known == True
        ).all()

def addPerson(db: Session, patient_id: int, name: str, relation: str,is_known: bool, image_bytes: bytes) -> Person:
    """Add a new known person to the database and return the Person object."""

    person = Person(
        patient_id=patient_id,
        name=name,
        relation=relation,
        is_known=is_known
    )
    db.add(person)
    db.commit()
    db.refresh(person)

    store_face_embeddings_for_person(db, person.id, image_bytes)
    return person
