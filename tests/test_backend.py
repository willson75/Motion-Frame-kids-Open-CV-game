import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.database.db import init_db, save_score, get_leaderboard, get_player_scores
from backend.computer_vision.gesture_detector import GestureDetector
from backend.computer_vision.motion_classifier import MotionClassifier

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "camera_available" in data

def test_games_endpoint():
    response = client.get("/api/games")
    assert response.status_code == 200
    games = response.json()
    assert len(games) == 5
    game_ids = [g["id"] for g in games]
    assert "motion_runner" in game_ids
    assert "fruit_catch" in game_ids

def test_score_submission_and_leaderboard():
    payload = {
        "player_name": "TestPlayer",
        "game_name": "motion_runner",
        "score": 1500,
        "coins": 30,
        "distance": 450
    }
    response = client.post("/api/scores", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True

    # Check leaderboard
    lb_response = client.get("/api/leaderboard?game=motion_runner")
    assert lb_response.status_code == 200
    lb = lb_response.json()
    assert len(lb) > 0
    assert lb[0]["player_name"] == "TestPlayer"
    assert lb[0]["score"] == 1500

def test_gesture_detector():
    gd = GestureDetector()
    pos = {"x": 0.3, "y": 0.4}
    res = gd.classify_hand(pos, is_pinching=False)
    assert res["event"] == "HAND_POSITION"
    assert res["x"] == 0.3

    pinch_res = gd.classify_hand(pos, is_pinching=True)
    assert pinch_res["event"] == "COLLECT"

def test_motion_classifier_calibration_and_lanes():
    mc = MotionClassifier()
    mc.start_calibration()
    
    # Add samples
    for _ in range(45):
        mc.add_calibration_sample({
            "center_x": 0.5,
            "head_y": 0.3,
            "hip_y": 0.6,
            "shoulder_width": 0.2,
            "body_height": 0.3
        })
    
    assert mc.is_calibrated is True

    # Test center lane
    res_center = mc.classify_pose({
        "center_x": 0.5,
        "head_y": 0.3,
        "hip_y": 0.6,
        "shoulder_width": 0.2,
        "body_height": 0.3
    })
    assert res_center["lane"] == "CENTER"

    # Test left lean (feed a couple frames for EMA smoothing)
    for _ in range(3):
        res_left = mc.classify_pose({
            "center_x": 0.35, # < 0.5 - 0.08
            "head_y": 0.3,
            "hip_y": 0.6,
            "shoulder_width": 0.2,
            "body_height": 0.3
        })
    assert res_left["lane"] == "LEFT"

    # Test right lean
    for _ in range(5):
        res_right = mc.classify_pose({
            "center_x": 0.65, # > 0.5 + 0.08
            "head_y": 0.3,
            "hip_y": 0.6,
            "shoulder_width": 0.2,
            "body_height": 0.3
        })
    assert res_right["lane"] == "RIGHT"

    # Test jump
    for _ in range(5):
        res_jump = mc.classify_pose({
            "center_x": 0.5,
            "head_y": 0.15, # < 0.3 - 0.07 (Upward jump)
            "hip_y": 0.45,
            "shoulder_width": 0.2,
            "body_height": 0.3
        })
    assert res_jump["action"] == "JUMP"
