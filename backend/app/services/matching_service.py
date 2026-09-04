from typing import List, Optional
from app.models.schemas import CrossCameraMatch, MatchBreakdown

# Sample simulated global vehicle matches database
CROSS_CAMERA_MATCHES_DB: List[CrossCameraMatch] = [
    CrossCameraMatch(
        global_vehicle_id="V1023",
        cameras_seen=["CAM_01", "CAM_03", "CAM_05"],
        timeline=[
            {"camera_id": "CAM_01", "name": "MG Road - Trinity Junction", "timestamp": "10:02:01", "speed_kmh": "48.2"},
            {"camera_id": "CAM_03", "name": "Koramangala Sony World Crossing", "timestamp": "10:07:34", "speed_kmh": "42.0"},
            {"camera_id": "CAM_05", "name": "Outer Ring Road - Bellandur Tech Hub", "timestamp": "10:14:12", "speed_kmh": "39.5"}
        ],
        final_score=0.91,
        breakdown=MatchBreakdown(
            plate_similarity=0.95,
            vehicle_type=0.90,
            appearance_features=0.81,
            travel_time=0.87,
            route_consistency=0.92
        )
    ),
    CrossCameraMatch(
        global_vehicle_id="V4089",
        cameras_seen=["CAM_02", "CAM_04", "CAM_06"],
        timeline=[
            {"camera_id": "CAM_02", "name": "Indiranagar 100ft Express Corridor", "timestamp": "10:11:05", "speed_kmh": "64.1"},
            {"camera_id": "CAM_04", "name": "Silk Board Central Flyover Interchange", "timestamp": "10:18:22", "speed_kmh": "58.0"},
            {"camera_id": "CAM_06", "name": "Electronic City Tollway Expressway", "timestamp": "10:25:50", "speed_kmh": "52.3"}
        ],
        final_score=0.88,
        breakdown=MatchBreakdown(
            plate_similarity=0.92,
            vehicle_type=0.94,
            appearance_features=0.79,
            travel_time=0.85,
            route_consistency=0.90
        )
    ),
    CrossCameraMatch(
        global_vehicle_id="V7712",
        cameras_seen=["CAM_01", "CAM_02"],
        timeline=[
            {"camera_id": "CAM_01", "name": "MG Road - Trinity Junction", "timestamp": "10:30:10", "speed_kmh": "35.2"},
            {"camera_id": "CAM_02", "name": "Indiranagar 100ft Express Corridor", "timestamp": "10:36:45", "speed_kmh": "51.0"}
        ],
        final_score=0.94,
        breakdown=MatchBreakdown(
            plate_similarity=0.98,
            vehicle_type=0.95,
            appearance_features=0.88,
            travel_time=0.93,
            route_consistency=0.96
        )
    )
]

def get_all_matches() -> List[CrossCameraMatch]:
    return CROSS_CAMERA_MATCHES_DB

def get_vehicle_trajectory(vehicle_id: str) -> Optional[CrossCameraMatch]:
    for match in CROSS_CAMERA_MATCHES_DB:
        if match.global_vehicle_id.upper() == vehicle_id.upper():
            return match
    return None
