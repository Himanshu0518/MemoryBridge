import math
import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from server.config.db import get_db
from server.models.location import Location
from server.schemas.location import LocationCreate, LocationResponse

router = APIRouter(tags=["Tracking"])

# Configurable constants for Geofencing
HOME_LAT = 28.7041     # Example safe center (Replace with actual if needed)
HOME_LON = 77.1025
SAFE_RADIUS_METERS = 50

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance in meters between two points."""
    R = 6371000 # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1)*math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

@router.post("/tracking/locations", response_model=LocationResponse)
def record_location(payload: LocationCreate, db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    
    # Find last known location to calculate speed
    last_loc = db.query(Location)\
        .filter(Location.patient_id == payload.patient_id)\
        .order_by(Location.timestamp.desc())\
        .first()
    
    speed_mps = 0.0
    if last_loc:
        distance = haversine(last_loc.latitude, last_loc.longitude, payload.latitude, payload.longitude)
        time_diff = (now - last_loc.timestamp).total_seconds()
        if time_diff > 0:
            speed_mps = distance / time_diff # Speed in Meters per second
            
    # Calculate Distant from Home Geofence
    dist_from_home = haversine(HOME_LAT, HOME_LON, payload.latitude, payload.longitude)
    is_breached = dist_from_home > SAFE_RADIUS_METERS
    
    new_loc = Location(
        patient_id=payload.patient_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        timestamp=now
    )
    db.add(new_loc)
    db.commit()
    db.refresh(new_loc)
    
    # Return calculated data alongside db model 
    return LocationResponse(
        id=new_loc.id,
        patient_id=new_loc.patient_id,
        latitude=new_loc.latitude,
        longitude=new_loc.longitude,
        timestamp=new_loc.timestamp,
        speed_mps=speed_mps,
        geofence_alert=is_breached
    )

@router.get("/tracking/patients/{patient_id}/locations")
def get_patient_path(patient_id: int, db: Session = Depends(get_db)):
    """Fetch chronological path memory."""
    locations = db.query(Location)\
        .filter(Location.patient_id == patient_id)\
        .order_by(Location.timestamp.asc())\
        .all()
    # We parse manually or just return instances, but let's return instances directly. 
    # FastAPI and Pydantic will serialize automatically.
    return locations

