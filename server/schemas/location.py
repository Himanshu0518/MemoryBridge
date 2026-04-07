from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LocationCreate(BaseModel):
    patient_id: int
    latitude: float
    longitude: float

class LocationResponse(BaseModel):
    id: int
    patient_id: int
    latitude: float
    longitude: float
    timestamp: datetime
    
    speed_mps: Optional[float] = None
    geofence_alert: Optional[bool] = False

    class Config:
        from_attributes = True
