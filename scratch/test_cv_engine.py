import cv2
import time
import numpy as np

from backend.computer_vision.camera_manager import CameraManager
from backend.computer_vision.hand_tracker import HandTracker
from backend.computer_vision.pose_tracker import PoseTracker
from backend.computer_vision.gesture_detector import GestureDetector
from backend.computer_vision.motion_classifier import MotionClassifier

def test_cv():
    print("Testing Camera Manager...")
    cam = CameraManager(0)
    started = cam.start()
    print(f"Camera started: {started}, status: {cam.get_status()}")

    if not started:
        print("Camera could not start. Testing with synthetic frames...")

    hand_tracker = HandTracker()
    pose_tracker = PoseTracker()
    gesture_detector = GestureDetector()
    motion_classifier = MotionClassifier()

    # Test with 30 synthetic or real frames
    for i in range(30):
        if started:
            ret, frame = cam.read()
        else:
            ret = True
            frame = np.zeros((480, 640, 3), dtype=np.uint8)

        if ret and frame is not None:
            hand_ok, hand_pos, hand_landmarks, is_pinching = hand_tracker.process(frame)
            pose_ok, body_metrics, pose_landmarks = pose_tracker.process(frame)
            
            pose_res = motion_classifier.classify_pose(body_metrics)
            hand_res = gesture_detector.classify_hand(hand_pos, is_pinching)

            if i % 10 == 0:
                print(f"Frame {i}: hand_ok={hand_ok}, pose_ok={pose_ok}, pose_res={pose_res}, hand_res={hand_res}")

        time.sleep(0.03)

    if started:
        cam.stop()
    hand_tracker.close()
    pose_tracker.close()
    print("CV Test Completed successfully.")

if __name__ == "__main__":
    test_cv()
