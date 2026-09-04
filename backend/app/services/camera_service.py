from typing import List, Optional
from app.models.schemas import Camera

CAMERAS_DB: List[Camera] = [
    Camera(
        camera_id="CAM_01",
        name="Financial District - North Crossing",
        latitude=37.7749,
        longitude=-122.4194,
        road_id="ROAD-A-B",
        video_source="simulated_feed_01.mp4",
        status="ONLINE",
        fps=30.0
    ),
    Camera(
        camera_id="CAM_02",
        name="Tech Expressway - Mile 4",
        latitude=37.7790,
        longitude=-122.4150,
        road_id="ROAD-B-C",
        video_source="simulated_feed_02.mp4",
        status="ONLINE",
        fps=29.97
    ),
    Camera(
        camera_id="CAM_03",
        name="Central Junction - Sector 5",
        latitude=37.7710,
        longitude=-122.4240,
        road_id="ROAD-C-D",
        video_source="simulated_feed_03.mp4",
        status="ONLINE",
        fps=30.0
    ),
    Camera(
        camera_id="CAM_04",
        name="City Harbor Way - East Gate",
        latitude=37.7680,
        longitude=-122.4100,
        road_id="ROAD-D-E",
        video_source="simulated_feed_04.mp4",
        status="ONLINE",
        fps=30.0
    ),
    Camera(
        camera_id="CAM_05",
        name="North Avenue - Terminal Interchange",
        latitude=37.7830,
        longitude=-122.4300,
        road_id="ROAD-E-F",
        video_source="simulated_feed_05.mp4",
        status="DEGRADED",
        fps=24.0
    ),
    Camera(
        camera_id="CAM_06",
        name="Suburb Boulevard - West Exit",
        latitude=37.7620,
        longitude=-122.4350,
        road_id="ROAD-F-A",
        video_source="simulated_feed_06.mp4",
        status="ONLINE",
        fps=30.0
    )
]

def get_all_cameras() -> List[Camera]:
    return CAMERAS_DB

def get_camera_by_id(camera_id: str) -> Optional[Camera]:
    for cam in CAMERAS_DB:
        if cam.camera_id == camera_id:
            return cam
    return None
