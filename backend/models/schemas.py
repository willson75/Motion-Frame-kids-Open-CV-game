from pydantic import BaseModel, Field
from typing import List, Optional

class ScoreCreate(BaseModel):
    player_name: str = Field(..., example="Alex")
    game_name: str = Field(..., example="motion_runner")
    score: int = Field(..., ge=0, example=1240)
    coins: Optional[int] = Field(0, example=25)
    distance: Optional[int] = Field(0, example=386)

class ScoreResponse(BaseModel):
    id: int
    player_name: str
    game_name: str
    score: int
    coins: int
    distance: int
    created_at: str

class GameInfo(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    control_type: str
    featured: bool = False
    icon: str

class HealthResponse(BaseModel):
    status: str
    camera_available: bool
    database_connected: bool
    version: str = "1.0.0"
