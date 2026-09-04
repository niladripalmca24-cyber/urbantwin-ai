from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: str

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)

# --- Camera Ingestion Schemas ---
class Camera(BaseModel):
    camera_id: str
    name: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    road_id: str
    video_source: str
    status: str = "ONLINE" # ONLINE, DEGRADED, OFFLINE
    fps: float = 30.0

# --- Vehicle Detection & Tracking Schemas ---
class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class Detection(BaseModel):
    detection_id: str
    camera_id: str
    timestamp: str
    vehicle_class: str # car, bus, truck, motorcycle, bicycle, pedestrian
    bbox: List[float] # [x1, y1, x2, y2]
    confidence: float = Field(..., ge=0.0, le=1.0)
    track_id: Optional[int] = None
    speed_kmh: Optional[float] = 0.0

class PlateObservation(BaseModel):
    observation_id: str
    vehicle_id: str
    camera_id: str
    timestamp: str
    plate_hash: str # Cryptographically hashed PII
    confidence: float
    raw_plate_masked: str # e.g. "ABC-***"

# --- Cross-Camera Matching Schemas ---
class MatchBreakdown(BaseModel):
    plate_similarity: float
    vehicle_type: float
    appearance_features: float
    travel_time: float
    route_consistency: float

class CrossCameraMatch(BaseModel):
    global_vehicle_id: str
    cameras_seen: List[str]
    timeline: List[Dict[str, str]] # [{camera_id, timestamp, speed_kmh}]
    final_score: float
    breakdown: MatchBreakdown

# --- Road Network Graph Schemas ---
class RoadSegment(BaseModel):
    road_id: str
    name: str
    start_node: str
    end_node: str
    length_km: float
    speed_limit_kmh: float

class TrafficMetrics(BaseModel):
    road_id: str
    timestamp: str
    vehicle_count: int
    avg_speed_kmh: float
    density: str # Low, Medium, High, Gridlock
    queue_length_m: float
    travel_time_min: float
    congestion_pct: float # 0.0 to 100.0

# --- ML Prediction Schemas ---
class PredictionHorizon(BaseModel):
    horizon_min: int # 5, 15, 30
    predicted_congestion_pct: float
    predicted_avg_speed_kmh: float
    confidence_interval: List[float] # [lower, upper]

class TrafficPrediction(BaseModel):
    road_id: str
    road_name: str
    current_congestion: float
    horizons: List[PredictionHorizon]
    model_type: str = "XGBoost + LSTM Ensembled"
    mae: float = 2.41
    rmse: float = 3.15

# --- Anomaly Detection Schemas ---
class Anomaly(BaseModel):
    anomaly_id: str
    camera_id: str
    road_id: str
    road_name: str
    anomaly_type: str # Sudden Slowdown, Long Queue, Congestion Spike, Camera Downtime
    severity: str # LOW, MEDIUM, HIGH, CRITICAL
    expected_speed_kmh: float
    current_speed_kmh: float
    anomaly_score: float = Field(..., ge=0.0, le=1.0)
    timestamp: str

# --- Digital Twin & What-If Simulation Schemas ---
class SimulationScenario(BaseModel):
    closed_roads: List[str] = Field(default_factory=list)
    traffic_volume_change_pct: float = Field(default=0.0, ge=-50.0, le=200.0) # e.g. +20%
    signal_timing_adjustments: Dict[str, int] = Field(default_factory=dict) # e.g. {"Junction_A": 40}

class SimulationComparisonItem(BaseModel):
    metric_name: str
    before: str
    after: str
    change_pct: float
    is_improvement: bool

class SimulationResult(BaseModel):
    scenario_id: str
    description: str
    metrics: List[SimulationComparisonItem]
    affected_roads: List[str]
    timestamp: str
