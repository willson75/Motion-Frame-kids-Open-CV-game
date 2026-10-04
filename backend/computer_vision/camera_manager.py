import cv2
import threading
import time
import numpy as np

from backend.config import CAMERA_INDEX, FRAME_WIDTH, FRAME_HEIGHT, TARGET_FPS

class CameraManager:
    """Thread-safe OpenCV Camera Manager supporting multiple camera indices and IP Webcam streams."""
    def __init__(self, camera_source=CAMERA_INDEX):
        self.camera_source = camera_source # int (e.g. 0, 1, 2) or str (e.g. "http://192.168.1.5:4747/video")
        self.cap = None
        self.is_running = False
        self.current_frame = None
        self.lock = threading.Lock()
        self.error_msg = None

    @staticmethod
    def list_available_cameras():
        """Scans system for available camera indices (0 to 5)."""
        available = []
        for i in range(5):
            try:
                cap = cv2.VideoCapture(i)
                if cap.isOpened():
                    ret, _ = cap.read()
                    if ret:
                        available.append({
                            "index": i,
                            "name": f"Camera Device {i}" + (" (Default/Laptop)" if i == 0 else " (Mobile/External Cam)")
                        })
                    cap.release()
            except Exception:
                pass
        return available

    def set_source(self, source):
        """Switches camera source dynamically (integer index or IP URL)."""
        self.stop()
        # Parse int if numeric string passed
        if isinstance(source, str) and source.isdigit():
            source = int(source)
        self.camera_source = source
        return self.start()

    def start(self):
        if self.is_running and self.cap is not None and self.cap.isOpened():
            return True
        try:
            if isinstance(self.camera_source, int):
                # Try standard backend first, then DSHOW for Windows
                self.cap = cv2.VideoCapture(self.camera_source)
                if not self.cap.isOpened():
                    self.cap = cv2.VideoCapture(self.camera_source, cv2.CAP_DSHOW)
            else:
                # IP Webcam stream URL (e.g. http://192.168.1.50:4747/video)
                self.cap = cv2.VideoCapture(str(self.camera_source))

            if not self.cap.isOpened():
                self.error_msg = f"Unable to open camera source: {self.camera_source}"
                self.is_running = False
                return False

            if isinstance(self.camera_source, int):
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
                self.cap.set(cv2.CAP_PROP_FPS, TARGET_FPS)

            self.is_running = True
            self.error_msg = None
            
            # Read first frame
            ret, frame = self.cap.read()
            if ret and frame is not None:
                with self.lock:
                    self.current_frame = cv2.flip(frame, 1) if isinstance(self.camera_source, int) else frame
            return True
        except Exception as e:
            self.error_msg = str(e)
            self.is_running = False
            return False

    def read(self):
        """Reads next frame (flipped horizontally for intuitive mirror reflection)."""
        if not self.is_running or self.cap is None:
            return False, None
        
        try:
            ret, frame = self.cap.read()
            if ret and frame is not None:
                if frame.shape[1] != FRAME_WIDTH or frame.shape[0] != FRAME_HEIGHT:
                    frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
                
                frame_mirrored = cv2.flip(frame, 1) if isinstance(self.camera_source, int) else frame
                with self.lock:
                    self.current_frame = frame_mirrored
                return True, frame_mirrored
        except Exception as e:
            self.error_msg = str(e)

        return False, None

    def stop(self):
        self.is_running = False
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

    def get_status(self):
        return {
            "is_running": self.is_running,
            "error": self.error_msg,
            "camera_source": self.camera_source
        }
