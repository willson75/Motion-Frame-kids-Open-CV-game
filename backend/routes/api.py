from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Union
from pydantic import BaseModel

from backend.models.schemas import ScoreCreate, ScoreResponse, GameInfo, HealthResponse
from backend.database.db import save_score, get_leaderboard, get_player_scores
from backend.computer_vision.camera_manager import CameraManager

router = APIRouter(prefix="/api")

class CameraSelectRequest(BaseModel):
    source: Union[int, str]

GAMES_LIST = [
    GameInfo(
        id="fruit_catch",
        title="Fruit Catch",
        description="Move your hand left and right to catch falling apples and bananas.",
        difficulty="Easy",
        control_type="Hand Tracking",
        featured=False,
        icon="🍎"
    ),
    GameInfo(
        id="balloon_pop",
        title="Balloon Pop",
        description="Aim your hand to pop colorful floating balloons before time runs out.",
        difficulty="Easy",
        control_type="Hand Tracking",
        featured=False,
        icon="🎈"
    ),
    GameInfo(
        id="star_collector",
        title="Star Collector",
        description="Move your hand quickly to collect glowing stars around the screen.",
        difficulty="Medium",
        control_type="Hand Tracking",
        featured=False,
        icon="⭐"
    ),
    GameInfo(
        id="motion_runner",
        title="Motion Runner",
        description="Your body is the controller! Lean left/right to change lanes, jump over barriers, and crouch under obstacles.",
        difficulty="Hard",
        control_type="Full Body Pose",
        featured=True,
        icon="🏃"
    ),
    GameInfo(
        id="freeze_move",
        title="Freeze & Move",
        description="Move when it says MOVE! Freeze completely still when it says FREEZE! Test your body control.",
        difficulty="Medium",
        control_type="Pose Motion Detection",
        featured=False,
        icon="🧊"
    )
]

# Global reference set by main.py
active_camera_manager: Optional[CameraManager] = None

def set_global_camera_manager(cm: CameraManager):
    global active_camera_manager
    active_camera_manager = cm

@router.get("/health", response_model=HealthResponse)
def check_health():
    camera_ok = False
    if active_camera_manager:
        camera_ok = active_camera_manager.is_running
    return HealthResponse(
        status="ok",
        camera_available=camera_ok,
        database_connected=True,
        version="1.0.0"
    )

@router.get("/camera/devices")
def list_camera_devices():
    """Scans and returns all connected camera devices (built-in, mobile/external, DroidCam, Iriun)."""
    devices = CameraManager.list_available_cameras()
    current = active_camera_manager.camera_source if active_camera_manager else 0
    return {
        "devices": devices,
        "current_source": current
    }

@router.post("/camera/select")
def select_camera_source(req: CameraSelectRequest):
    """Switch active camera source to selected camera index or IP Webcam URL."""
    if not active_camera_manager:
        raise HTTPException(status_code=500, detail="Camera manager not initialized")
    
    success = active_camera_manager.set_source(req.source)
    if not success:
        return {
            "success": False,
            "message": f"Could not open camera source '{req.source}'. Please check mobile camera connection.",
            "current_source": active_camera_manager.camera_source
        }
    return {
        "success": True,
        "message": f"Camera source updated to '{req.source}'!",
        "current_source": active_camera_manager.camera_source
    }

@router.get("/games", response_model=List[GameInfo])
def list_games():
    return GAMES_LIST

@router.post("/scores")
def create_score(score_in: ScoreCreate):
    if not score_in.player_name.strip():
        raise HTTPException(status_code=400, detail="Player name cannot be empty")
    
    score_id = save_score(
        player_name=score_in.player_name.strip(),
        game_name=score_in.game_name,
        score=score_in.score,
        coins=score_in.coins or 0,
        distance=score_in.distance or 0
    )
    return {"success": True, "id": score_id, "message": "Score saved successfully"}

@router.get("/leaderboard")
def fetch_leaderboard(game: Optional[str] = Query(None, description="Game ID or ALL"), limit: int = 10):
    return get_leaderboard(game_name=game, limit=limit)

@router.get("/player/{name}/scores")
def fetch_player_scores(name: str):
    return get_player_scores(player_name=name)
