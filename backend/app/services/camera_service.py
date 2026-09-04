from typing import List, Optional
from app.models.schemas import Camera

CAMERAS_DB: List[Camera] = [
    Camera(
        camera_id="CAM_01",
        name="MG Road - Trinity Junction",
        latitude=12.9756,
        longitude=77.6067,
        road_id="ROAD-A-B",
        video_source="simulated_feed_01.mp4",
        status="ONLINE",
        fps=30.0
    ),
    Camera(
        camera_id="CAM_02",
        name="Indiranagar 100ft Express Corridor",
        latitude=12.9784,
        longitude=77.6408,
        road_id="ROAD-B-C",
        video_source="simulated_feed_02.mp4",
        status="ONLINE",
        fps=29.97
    ),
    Camera(
        camera_id="CAM_03",
        name="Koramangala Sony World Crossing",
        latitude=12.9352,
        longitude=77.6245,
        road_id="ROAD-C-D",
        video_source="simulated_feed_03.mp4",
        status="ONLINE",
        fps=30.0
    ),
    Camera(
        camera_id="CAM_04",
        name="Silk Board Central Flyover Interchange",
        latitude=12.9176,
        longitude=77.6238,
        road_id="ROAD-D-E",
        video_source="simulated_feed_04.mp4",
        status="ONLINE",
        fps=30.0
    ),
    Camera(
        camera_id="CAM_05",
        name="Outer Ring Road - Bellandur Tech Hub",
        latitude=12.9260,
        longitude=77.6762,
        road_id="ROAD-E-F",
        video_source="simulated_feed_05.mp4",
        status="DEGRADED",
        fps=24.0
    ),
    Camera(
        camera_id="CAM_06",
        name="Electronic City Tollway Expressway",
        latitude=12.8452,
        longitude=77.6602,
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
