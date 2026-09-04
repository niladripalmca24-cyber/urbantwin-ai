import random
from datetime import datetime
from app.models.schemas import PlateObservation
from app.core.security import anonymize_plate

MOCK_RAW_PLATES = [
    "7XYZ912", "3ABC456", "9KLM882", "5DEF123", "8TRK991", "2BUS704"
]

def process_anpr_ocr(camera_id: str, vehicle_track_id: str) -> PlateObservation:
    """
    ANPR Pipeline:
    1. Plate Detection
    2. Image Preprocessing & OCR
    3. Cryptographic Salted SHA-256 Anonymization (Privacy Security Hardening)
    """
    raw_plate = random.choice(MOCK_RAW_PLATES)
    anonymized_hash = anonymize_plate(raw_plate)
    masked_plate = f"{raw_plate[:3]}-***"
    
    return PlateObservation(
        observation_id=f"OBS-{camera_id}-{datetime.utcnow().strftime('%H%M%S')}",
        vehicle_id=vehicle_track_id,
        camera_id=camera_id,
        timestamp=datetime.utcnow().isoformat(),
        plate_hash=anonymized_hash,
        confidence=round(random.uniform(0.91, 0.99), 2),
        raw_plate_masked=masked_plate
    )
