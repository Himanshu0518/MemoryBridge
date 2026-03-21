from pydantic import BaseModel
from typing import Optional


# ── response returned after storing a face ────────────────────────────────────
class StoreFaceResponse(BaseModel):
    message: str
    embeddings_stored: int
    known_person_id: int


# ── response returned after a match attempt ───────────────────────────────────
class MatchFaceResponse(BaseModel):
    recognised: bool

    # populated when recognised = True
    known_person_id:       Optional[int]   = None
    known_person_name:     Optional[str]   = None
    known_person_relation: Optional[str]   = None
    similarity:            Optional[float] = None
    confidence:            Optional[float] = None

    # populated when recognised = False (and a face was detected)
    unknown_face_id: Optional[int]   = None
    error:           Optional[str]   = None   # "no_face_detected"
