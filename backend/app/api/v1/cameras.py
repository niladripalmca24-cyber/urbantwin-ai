from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Request
from app.models.schemas import Camera
from app.services import camera_service, detection_service, anpr_service
from app.core.rate_limiter import limiter

router = APIRouter(prefix="/cameras", tags=["Camera Feeds"])

@router.get("", response_model=List[Camera])
@limiter.limit("60/minute")
def list_cameras(request: Request):
    """Retrieve catalog of all traffic cameras and active stream states."""
    return camera_service.get_all_cameras()

@router.get("/{camera_id}", response_model=Camera)
@limiter.limit("60/minute")
def get_camera(request: Request, camera_id: str):
    """Retrieve detailed state for a specific camera stream."""
    cam = camera_service.get_camera_by_id(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' not found")
    return cam

@router.post("/{camera_id}/process", response_model=Dict[str, Any])
@limiter.limit("30/minute")
def process_camera_frame(request: Request, camera_id: str):
    """
    Triggers live frame processing pipeline for a camera feed:
    1. YOLO object detection & bounding box calculation
    2. Multi-object tracking assignment
    3. ANPR OCR + Salted SHA-256 PII plate anonymization
    """
    cam = camera_service.get_camera_by_id(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' not found")
        
    detections = detection_service.generate_live_detections(camera_id, count=6)
    
    # Process ANPR observation for one detected vehicle safely (anonymized)
    track_id = str(detections[0].track_id) if detections else "1001"
    sample_plate = anpr_service.process_anpr_ocr(camera_id, track_id)
    
    return {
        "camera_id": camera_id,
        "camera_name": cam.name,
        "fps": cam.fps,
        "detections_count": len(detections),
        "detections": [d.model_dump() for d in detections],
        "sample_plate_observation": sample_plate.model_dump()
    }
