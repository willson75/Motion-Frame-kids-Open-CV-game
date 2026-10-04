import cv2
import numpy as np

class PoseTracker:
    """High-performance self-contained Pose & Body Motion Tracker using OpenCV Motion Contours."""
    def __init__(self):
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(history=120, varThreshold=30, detectShadows=False)
        self.prev_body_box = None

    def process(self, frame):
        """
        Process BGR frame and return:
        - pose_detected (bool)
        - body_metrics: {
            "center_x": float,
            "head_y": float,
            "hip_y": float,
            "shoulder_width": float,
            "body_height": float
          }
        - landmarks: list of dicts
        """
        if frame is None:
            return False, None, []

        h, w = frame.shape[:2]

        # 1. Background Subtraction for Body Motion
        fg_mask = self.bg_subtractor.apply(frame)

        # 2. HSV Color Segmentation for Upper Body / Player Detection
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        # Broader color mask for upper body / clothing & skin
        lower_bound = np.array([0, 15, 40], dtype=np.uint8)
        upper_bound = np.array([180, 255, 255], dtype=np.uint8)
        color_mask = cv2.inRange(hsv, lower_bound, upper_bound)

        # Combine motion & color
        combined = cv2.bitwise_and(color_mask, fg_mask)

        # Clean noise with Gaussian Blur and Morphology
        blurred = cv2.GaussianBlur(combined, (9, 9), 0)
        _, thresh = cv2.threshold(blurred, 40, 255, cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

        # Find Contours
        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            # Fallback to pure fg_mask if combined mask has no contours
            contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return False, None, []

        # Filter contours by minimum area (player body)
        large_contours = [c for c in contours if cv2.contourArea(c) > 1200]
        if not large_contours:
            return False, None, []

        # Find largest contour representing the player's body
        largest_c = max(large_contours, key=cv2.contourArea)
        body_x, body_y, body_w, body_h = cv2.boundingRect(largest_c)

        # Exponential smoothing over frames
        if self.prev_body_box is not None:
            px, py, pw, ph = self.prev_body_box
            body_x = int(0.35 * body_x + 0.65 * px)
            body_y = int(0.35 * body_y + 0.65 * py)
            body_w = int(0.35 * body_w + 0.65 * pw)
            body_h = int(0.35 * body_h + 0.65 * ph)

        self.prev_body_box = (body_x, body_y, body_w, body_h)

        # Calculate Normalized Body Metrics
        center_x = (body_x + body_w / 2.0) / float(w)
        head_y = body_y / float(h)
        hip_y = (body_y + body_h * 0.65) / float(h)
        shoulder_width = body_w / float(w)
        body_height = body_h / float(h)

        body_metrics = {
            "center_x": round(float(center_x), 4),
            "head_y": round(float(head_y), 4),
            "hip_y": round(float(hip_y), 4),
            "shoulder_width": round(float(shoulder_width), 4),
            "body_height": round(float(body_height), 4)
        }

        landmarks_list = [
            {"x": round(center_x, 4), "y": round(head_y, 4), "z": 0.0},
            {"x": round(center_x - shoulder_width / 3, 4), "y": round(head_y + 0.1, 4), "z": 0.0},
            {"x": round(center_x + shoulder_width / 3, 4), "y": round(head_y + 0.1, 4), "z": 0.0},
            {"x": round(center_x - shoulder_width / 3, 4), "y": round(hip_y, 4), "z": 0.0},
            {"x": round(center_x + shoulder_width / 3, 4), "y": round(hip_y, 4), "z": 0.0}
        ]

        return True, body_metrics, landmarks_list

    def close(self):
        pass
