from typing import List
from fastapi import APIRouter, Request
from app.models.schemas import Anomaly
from app.services.anomaly_service import get_active_anomalies
from app.core.rate_limiter import limiter

router = APIRouter(prefix="/anomalies", tags=["Anomaly Detection"])

@router.get("", response_model=List[Anomaly])
@limiter.limit("60/minute")
def get_anomalies(request: Request):
    """Retrieve active traffic anomalies, unexpected slowdowns, and sensor alerts."""
    return get_active_anomalies()
