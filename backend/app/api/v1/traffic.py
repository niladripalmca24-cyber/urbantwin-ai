from typing import List, Dict, Any
from fastapi import APIRouter, Request
from app.models.schemas import TrafficMetrics
from app.services.graph_service import get_all_traffic_current
from app.core.rate_limiter import limiter

router = APIRouter(prefix="/traffic", tags=["Traffic Analytics"])

@router.get("/current", response_model=List[TrafficMetrics])
@limiter.limit("60/minute")
def get_current_traffic(request: Request):
    """Retrieve real-time traffic metrics (speeds, volumes, queues, congestion) for all road segments."""
    return get_all_traffic_current()

@router.get("/history", response_model=List[Dict[str, Any]])
@limiter.limit("60/minute")
def get_traffic_history(request: Request):
    """Retrieve historical 24-hour traffic volume and speed trend analytics."""
    hours = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]
    volumes = [120, 80, 45, 310, 890, 720, 680, 740, 950, 860, 510, 240]
    avg_speeds = [68, 72, 75, 52, 28, 38, 42, 36, 22, 31, 48, 62]
    
    history = []
    for h, v, s in zip(hours, volumes, avg_speeds):
        history.append({
            "hour": h,
            "vehicle_volume": v,
            "avg_speed_kmh": s,
            "congestion_pct": round(max(10, min(95, 100 - (s / 75 * 100))), 1)
        })
    return history
