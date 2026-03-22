from pydantic import BaseModel
from typing import Optional, Any


# ── response returned after storing a face ────────────────────────────────────
class StoreFaceResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


# ── response returned after a match attempt ───────────────────────────────────
class MatchFaceResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
