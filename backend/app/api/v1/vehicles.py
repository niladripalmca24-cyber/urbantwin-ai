from typing import List
from fastapi import APIRouter, HTTPException, Request
from app.models.schemas import CrossCameraMatch
from app.services.matching_service import get_all_matches, get_vehicle_trajectory
from app.core.rate_limiter import limiter

router = APIRouter(prefix="/vehicles", tags=["Vehicle Re-ID & Trajectory"])

@router.get("", response_model=List[CrossCameraMatch])
@router.get("/matches", response_model=List[CrossCameraMatch])
@limiter.limit("60/minute")
def list_vehicle_matches(request: Request):
    """Retrieve multi-camera vehicle re-identification matching confidence results."""
    return get_all_matches()

@router.get("/{vehicle_id}/trajectory", response_model=CrossCameraMatch)
@limiter.limit("60/minute")
def get_trajectory(request: Request, vehicle_id: str):
    """Retrieve full camera sequence timeline and multi-factor matching breakdown for a global vehicle ID."""
    traj = get_vehicle_trajectory(vehicle_id)
    if not traj:
        raise HTTPException(status_code=404, detail=f"Vehicle trajectory for '{vehicle_id}' not found. Try 'V1023' or 'V4089'")
    return traj
