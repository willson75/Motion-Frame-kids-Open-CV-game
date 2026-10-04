import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "motionplay.db")

CAMERA_INDEX = 0
FRAME_WIDTH = 640
FRAME_HEIGHT = 480
TARGET_FPS = 30

# Computer Vision Thresholds
MIN_DETECTION_CONFIDENCE = 0.4
MIN_TRACKING_CONFIDENCE = 0.4

# Highly Sensitive Pose Motion Thresholds (Normalized 0.0 - 1.0)
# Lower thresholds mean smaller body lean / jump / crouch triggers action instantly!
LEAN_LEFT_THRESHOLD = -0.035   # Only 3.5% lean left required!
LEAN_RIGHT_THRESHOLD = 0.035   # Only 3.5% lean right required!
JUMP_THRESHOLD_Y = -0.030      # Only 3.0% upward motion required!
CROUCH_THRESHOLD_Y = 0.035     # Only 3.5% downward motion required!

# Motion State Threshold for Freeze & Move
FREEZE_MOVEMENT_THRESHOLD = 0.02

# High responsiveness smoothing (0.75 = 75% current frame, 25% past -> ultra fast response!)
SMOOTHING_FACTOR = 0.88

