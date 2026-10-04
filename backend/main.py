import asyncio
import base64
import cv2
import json
import logging
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.database.db import init_db
from backend.routes.api import router as api_router
from backend.computer_vision.camera_manager import CameraManager
from backend.computer_vision.hand_tracker import HandTracker
from backend.computer_vision.pose_tracker import PoseTracker
from backend.computer_vision.gesture_detector import GestureDetector
from backend.computer_vision.motion_classifier import MotionClassifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("motionplay")

# Global Computer Vision Engine Singletons
camera_manager = CameraManager()
hand_tracker = None
pose_tracker = None
gesture_detector = GestureDetector()
motion_classifier = MotionClassifier()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket client disconnected.")

    async def broadcast(self, data: dict):
        if not self.active_connections:
            return
        message = json.dumps(data)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global hand_tracker, pose_tracker
    logger.info("Initializing MotionPlay Backend...")
    init_db()
    
    from backend.routes.api import set_global_camera_manager
    set_global_camera_manager(camera_manager)

    # Initialize Trackers
    try:
        hand_tracker = HandTracker()
        pose_tracker = PoseTracker()
    except Exception as e:
        logger.error(f"Failed to initialize trackers: {e}")

    # Start Camera Manager
    camera_started = camera_manager.start()
    logger.info(f"Camera manager started: {camera_started}")

    # Start async frame processing task
    processing_task = asyncio.create_task(cv_processing_loop())

    yield

    # Cleanup on shutdown
    logger.info("Shutting down MotionPlay Backend...")
    processing_task.cancel()
    if camera_manager:
        camera_manager.stop()
    if hand_tracker:
        hand_tracker.close()
    if pose_tracker:
        pose_tracker.close()

app = FastAPI(title="MotionPlay API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

calibration_in_progress = False

async def cv_processing_loop():
    global calibration_in_progress
    frame_counter = 0

    while True:
        try:
            if ws_manager.active_connections:
                frame_counter += 1
                ret, frame = camera_manager.read()

                # If webcam is unavailable, create synthetic fallback frame so detection loop never hangs!
                if not ret or frame is None:
                    frame = np.zeros((480, 640, 3), dtype=np.uint8)
                    cv2.putText(frame, "CAM OFFLINE - MOTION ENGINE ACTIVE", (50, 240),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                    camera_active_flag = False
                else:
                    camera_active_flag = True

                # Process Hand Tracking
                hand_ok, hand_pos, hand_landmarks, is_pinching = False, None, [], False
                if hand_tracker:
                    hand_ok, hand_pos, hand_landmarks, is_pinching = hand_tracker.process(frame)

                hand_data = gesture_detector.classify_hand(hand_pos, is_pinching)

                # Process Pose Tracking
                pose_ok, body_metrics, pose_landmarks = False, None, []
                if pose_tracker:
                    pose_ok, body_metrics, pose_landmarks = pose_tracker.process(frame)

                # Handle Calibration if active
                calib_done = False
                calib_progress = 1.0 if motion_classifier.is_calibrated else 0.0

                if calibration_in_progress:
                    if not body_metrics:
                        # Synthetic baseline if camera obscured
                        body_metrics = {"center_x": 0.5, "head_y": 0.3, "hip_y": 0.6, "shoulder_width": 0.2, "body_height": 0.3}
                    calib_done, calib_progress = motion_classifier.add_calibration_sample(body_metrics)
                    if calib_done:
                        calibration_in_progress = False

                pose_data = motion_classifier.classify_pose(body_metrics)

                # Compress preview frame
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 50])
                jpg_as_text = base64.b64encode(buffer).decode('utf-8')

                payload = {
                    "type": "MOTION_UPDATE",
                    "camera_active": camera_active_flag,
                    "hand": {
                        "detected": hand_ok,
                        "pos": hand_pos,
                        "event": hand_data["event"],
                        "is_pinching": is_pinching,
                        "landmarks": hand_landmarks
                    },
                    "pose": {
                        "detected": pose_ok,
                        "lane": pose_data["lane"],
                        "action": pose_data["action"],
                        "movement_delta": pose_data["movement_delta"],
                        "landmarks": pose_landmarks,
                        "smoothed_x": pose_data.get("smoothed_center_x", 0.5),
                        "smoothed_y": pose_data.get("smoothed_head_y", 0.5)
                    },
                    "calibration": {
                        "is_calibrated": motion_classifier.is_calibrated,
                        "in_progress": calibration_in_progress,
                        "progress": round(calib_progress, 2)
                    },
                    "preview_frame": f"data:image/jpeg;base64,{jpg_as_text}"
                }

                await ws_manager.broadcast(payload)
            await asyncio.sleep(0.033)  # ~30 FPS loop
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in CV processing loop: {e}")
            await asyncio.sleep(0.1)

@app.websocket("/ws/motion")
async def websocket_endpoint(websocket: WebSocket):
    global calibration_in_progress
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            action = msg.get("action")
            if action == "START_CALIBRATION":
                logger.info("Starting pose calibration...")
                motion_classifier.start_calibration()
                calibration_in_progress = True
                await websocket.send_json({
                    "type": "CALIBRATION_STARTED",
                    "status": "in_progress"
                })
            elif action == "SET_SENSITIVITY":
                level = msg.get("level", "ULTRA")
                motion_classifier.set_sensitivity(level)
                await websocket.send_json({
                    "type": "SENSITIVITY_UPDATED",
                    "level": motion_classifier.sensitivity_level
                })
            elif action == "RESET_CAMERA":
                logger.info("Resetting camera manager...")
                camera_manager.stop()
                camera_manager.start()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

