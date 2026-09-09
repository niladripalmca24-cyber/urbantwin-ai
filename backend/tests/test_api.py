import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import anonymize_plate

client = TestClient(app)

def test_root_and_health():
    # Test root 3D Homepage HTML
    response = client.get("/")
    assert response.status_code == 200
    assert "UrbanTwin" in response.text
    assert "3D AI" in response.text or "3D" in response.text
    assert "X-Frame-Options" in response.headers
    assert response.headers["X-Frame-Options"] == "SAMEORIGIN"

    # Test /dashboard and /ui routes
    res_dash = client.get("/dashboard")
    assert res_dash.status_code == 200
    assert "UrbanTwin" in res_dash.text

    res_ui = client.get("/ui")
    assert res_ui.status_code == 200

    # Test health check JSON
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"


def test_anpr_plate_anonymization_security():
    plate = "7XYZ912"
    anon1 = anonymize_plate(plate)
    anon2 = anonymize_plate(plate)
    assert anon1.startswith("PLT-")
    assert anon1 == anon2  # Deterministic with salt
    assert plate not in anon1  # Ensures PII raw plate is never present in hash

def test_auth_login():
    # Valid login
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    assert "access_token" in res.json()

    # Invalid login
    res_bad = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert res_bad.status_code == 401

def test_cameras_endpoint():
    res = client.get("/api/v1/cameras")
    assert res.status_code == 200
    cameras = res.json()
    assert len(cameras) >= 6
    assert cameras[0]["camera_id"] == "CAM_01"

def test_process_camera_frame():
    res = client.post("/api/v1/cameras/CAM_01/process")
    assert res.status_code == 200
    data = res.json()
    assert data["camera_id"] == "CAM_01"
    assert len(data["detections"]) > 0
    assert "sample_plate_observation" in data
    assert data["sample_plate_observation"]["plate_hash"].startswith("PLT-")

def test_traffic_current_and_history():
    res_curr = client.get("/api/v1/traffic/current")
    assert res_curr.status_code == 200
    assert len(res_curr.json()) > 0

    res_hist = client.get("/api/v1/traffic/history")
    assert res_hist.status_code == 200
    assert len(res_hist.json()) == 12

def test_vehicle_trajectory():
    res = client.get("/api/v1/vehicles/V1023/trajectory")
    assert res.status_code == 200
    traj = res.json()
    assert traj["global_vehicle_id"] == "V1023"
    assert traj["final_score"] == 0.91

def test_traffic_predictions():
    res = client.get("/api/v1/predictions")
    assert res.status_code == 200
    preds = res.json()
    assert len(preds) > 0
    assert len(preds[0]["horizons"]) == 3  # 5, 15, 30 min

def test_anomalies_endpoint():
    res = client.get("/api/v1/anomalies")
    assert res.status_code == 200
    assert len(res.json()) > 0

def test_whatif_simulation():
    payload = {
        "closed_roads": ["ROAD-A-B"],
        "traffic_volume_change_pct": 20.0,
        "signal_timing_adjustments": {"Junction_Trinity": 40}
    }
    res = client.post("/api/v1/simulation", json=payload)
    assert res.status_code == 200
    sim = res.json()
    assert "scenario_id" in sim
    assert len(sim["metrics"]) == 3

def test_interactive_swagger_and_redoc():
    # Test Swagger UI
    res_docs = client.get("/docs")
    assert res_docs.status_code == 200
    assert "swagger-ui" in res_docs.text
    assert "persistAuthorization" in res_docs.text
    assert "tryItOutEnabled" in res_docs.text

    # Test ReDoc
    res_redoc = client.get("/redoc")
    assert res_redoc.status_code == 200
    assert "redoc" in res_redoc.text

    # Test OpenAPI schema
    res_openapi = client.get("/openapi.json")
    assert res_openapi.status_code == 200
    schema = res_openapi.json()
    
    # Verify security schemes present for Swagger UI Authorize dialog
    assert "components" in schema
    assert "securitySchemes" in schema["components"]
    assert "BearerAuth" in schema["components"]["securitySchemes"]
    assert "OAuth2PasswordBearer" in schema["components"]["securitySchemes"]
    assert "security" in schema

    # Verify static routes are not polluting OpenAPI specification
    paths = schema["paths"]
    assert "/" not in paths
    assert "/dashboard" not in paths
    assert "/ui" not in paths
    assert "/app" not in paths

    # Verify real API routes are cleanly documented
    assert "/api/v1/cameras" in paths
    assert "/api/v1/simulation" in paths

def test_no_github_links_in_ui():
    res = client.get("/")
    assert res.status_code == 200
    # Confirm no github references in landing page
    assert "github.com" not in res.text
    assert "fa-brands fa-github" not in res.text
    # Confirm Swagger and ReDoc links are present
    assert "/docs" in res.text
    assert "/redoc" in res.text

    # Confirm dashboard has links to /docs and /redoc
    res_dash = client.get("/dashboard")
    assert res_dash.status_code == 200
    assert "/docs" in res_dash.text
    assert "/redoc" in res_dash.text

