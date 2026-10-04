import numpy as np

from backend.config import (
    LEAN_LEFT_THRESHOLD,
    LEAN_RIGHT_THRESHOLD,
    JUMP_THRESHOLD_Y,
    CROUCH_THRESHOLD_Y,
    FREEZE_MOVEMENT_THRESHOLD,
    SMOOTHING_FACTOR
)

class MotionClassifier:
    """Full-body pose motion classifier with adjustable sensitivity and fast EMA response."""
    def __init__(self):
        self.is_calibrated = False
        self.calibration_samples = []
        self.calibrated_center_x = 0.5
        self.calibrated_head_y = 0.3
        self.calibrated_hip_y = 0.6
        self.calibrated_body_height = 0.3

        # Sensitivity preset multiplier: 1.0 (High), 1.5 (Ultra High), 0.7 (Medium)
        self.sensitivity_level = "ULTRA"
        self.lean_threshold = 0.018   # 3% screen width
        self.jump_threshold = 0.016  # 2.5% screen height
        self.crouch_threshold = 0.020 # 3% screen height

        self.smoothed_center_x = 0.5
        self.smoothed_head_y = 0.3
        self.smoothed_hip_y = 0.6

        self.prev_metrics = None

    def set_sensitivity(self, level: str):
        self.sensitivity_level = level.upper()
        if self.sensitivity_level == "ULTRA":
            self.lean_threshold = 0.018
            self.jump_threshold = 0.016
            self.crouch_threshold = 0.020
        elif self.sensitivity_level == "HIGH":
            self.lean_threshold = 0.0185
            self.jump_threshold = 0.030
            self.crouch_threshold = 0.0205
        else: # MEDIUM
            self.lean_threshold = 0.05
            self.jump_threshold = 0.04
            self.crouch_threshold = 0.05

    def start_calibration(self):
        self.is_calibrated = False
        self.calibration_samples = []

    def add_calibration_sample(self, body_metrics):
        if not body_metrics:
            return False, 0.0

        self.calibration_samples.append(body_metrics)
        progress = min(1.0, len(self.calibration_samples) / 30.0) # ~1 sec fast calibration

        if len(self.calibration_samples) >= 30:
            centers = [m["center_x"] for m in self.calibration_samples]
            heads = [m["head_y"] for m in self.calibration_samples]
            hips = [m["hip_y"] for m in self.calibration_samples]
            heights = [m["body_height"] for m in self.calibration_samples]

            self.calibrated_center_x = float(np.median(centers))
            self.calibrated_head_y = float(np.median(heads))
            self.calibrated_hip_y = float(np.median(hips))
            self.calibrated_body_height = float(np.median(heights))

            self.smoothed_center_x = self.calibrated_center_x
            self.smoothed_head_y = self.calibrated_head_y
            self.smoothed_hip_y = self.calibrated_hip_y

            self.is_calibrated = True
            return True, 1.0

        return False, progress

    def classify_pose(self, body_metrics):
        if not body_metrics:
            return {
                "lane": "CENTER",
                "action": "RUNNING",
                "movement_delta": 0.0,
                "is_calibrated": self.is_calibrated,
                "raw_x": 0.5,
                "raw_y": 0.5
            }

        # Fast response smoothing (0.75 alpha for instant reaction)
        alpha = SMOOTHING_FACTOR
        self.smoothed_center_x = alpha * body_metrics["center_x"] + (1 - alpha) * self.smoothed_center_x
        self.smoothed_head_y = alpha * body_metrics["head_y"] + (1 - alpha) * self.smoothed_head_y
        self.smoothed_hip_y = alpha * body_metrics["hip_y"] + (1 - alpha) * self.smoothed_hip_y

        # Lane Detection
        dx = self.smoothed_center_x - self.calibrated_center_x
        if dx < -self.lean_threshold:
            lane = "LEFT"
        elif dx > self.lean_threshold:
            lane = "RIGHT"
        else:
            lane = "CENTER"

        # Action Detection
        dy_head = self.smoothed_head_y - self.calibrated_head_y
        
        if dy_head < -self.jump_threshold:
            action = "JUMP"
        elif dy_head > self.crouch_threshold:
            action = "CROUCH"
        else:
            action = "RUNNING"

        movement_delta = 0.0
        if self.prev_metrics:
            d_x = abs(body_metrics["center_x"] - self.prev_metrics["center_x"])
            d_y = abs(body_metrics["head_y"] - self.prev_metrics["head_y"])
            movement_delta = round(float(d_x + d_y), 4)

        self.prev_metrics = body_metrics

        return {
            "lane": lane,
            "action": action,
            "movement_delta": movement_delta,
            "is_calibrated": self.is_calibrated,
            "smoothed_center_x": round(float(self.smoothed_center_x), 4),
            "smoothed_head_y": round(float(self.smoothed_head_y), 4),
            "offset_x": round(float(dx), 4),
            "offset_y": round(float(dy_head), 4)
        }

