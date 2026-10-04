"""Reliable, low-latency hand tracking powered by MediaPipe Tasks."""
import math
import os
import time
import cv2
import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions


class HandTracker:
    """Tracks real 21-point hand landmarks and exposes the index fingertip as control input."""

    CONNECTIONS = (
        (0,1),(1,2),(2,3),(3,4),(0,5),(5,6),(6,7),(7,8),(5,9),
        (9,10),(10,11),(11,12),(9,13),(13,14),(14,15),(15,16),
        (13,17),(17,18),(18,19),(19,20),(0,17)
    )

    def __init__(self, max_num_hands=2):
        model_path = os.path.join(os.path.dirname(__file__), "hand_landmarker.task")
        if not os.path.exists(model_path):
            raise RuntimeError("hand_landmarker.task is missing from backend/computer_vision")

        options = vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model_path),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=max_num_hands,
            min_hand_detection_confidence=0.55,
            min_hand_presence_confidence=0.45,
            min_tracking_confidence=0.40,
        )
        self.landmarker = vision.HandLandmarker.create_from_options(options)
        self.smoothed_pos = None
        self.missed_frames = 0
        self.last_timestamp_ms = 0

    def _timestamp(self):
        timestamp = int(time.monotonic() * 1000)
        self.last_timestamp_ms = max(timestamp, self.last_timestamp_ms + 1)
        return self.last_timestamp_ms

    def process(self, frame):
        """Return state, index-finger position, 21 actual landmarks, and pinch state."""
        if frame is None:
            return False, None, [], False

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self.landmarker.detect_for_video(image, self._timestamp())

        if not result.hand_landmarks:
            self.missed_frames += 1
            if self.missed_frames > 4:
                self.smoothed_pos = None
            return False, None, [], False

        self.missed_frames = 0
        points = result.hand_landmarks[0]
        h, w = frame.shape[:2]
        tip, thumb_tip, wrist, middle_mcp = points[8], points[4], points[0], points[9]
        raw_x = min(1.0, max(0.0, float(tip.x)))
        raw_y = min(1.0, max(0.0, float(tip.y)))

        if self.smoothed_pos is None:
            smooth_x, smooth_y = raw_x, raw_y
        else:
            alpha = 0.82
            smooth_x = alpha * raw_x + (1 - alpha) * self.smoothed_pos[0]
            smooth_y = alpha * raw_y + (1 - alpha) * self.smoothed_pos[1]
        self.smoothed_pos = (smooth_x, smooth_y)

        pinch_distance = math.hypot(tip.x - thumb_tip.x, tip.y - thumb_tip.y)
        hand_scale = max(0.05, math.hypot(wrist.x - middle_mcp.x, wrist.y - middle_mcp.y))
        is_pinching = pinch_distance < hand_scale * 0.52
        landmark_list = [{"x": round(float(p.x), 4), "y": round(float(p.y), 4), "z": round(float(p.z), 4)} for p in points]

        # Render a lightweight, high-contrast landmark skeleton in the player preview.
        for start, end in self.CONNECTIONS:
            a, b = points[start], points[end]
            cv2.line(frame, (int(a.x * w), int(a.y * h)), (int(b.x * w), int(b.y * h)), (120, 230, 155), 2, cv2.LINE_AA)
        for point in points:
            cv2.circle(frame, (int(point.x * w), int(point.y * h)), 3, (255, 255, 255), -1, cv2.LINE_AA)
        tip_px = (int(raw_x * w), int(raw_y * h))
        cv2.circle(frame, tip_px, 10, (68, 211, 146) if is_pinching else (53, 178, 241), 2)
        cv2.putText(frame, "PINCH" if is_pinching else "INDEX", (tip_px[0] + 12, max(20, tip_px[1] - 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

        return True, {"x": round(smooth_x, 4), "y": round(smooth_y, 4), "z": round(float(tip.z), 4)}, landmark_list, is_pinching

    def close(self):
        self.landmarker.close()
