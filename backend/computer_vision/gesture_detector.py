class GestureDetector:
    """Classifier converting hand tracking landmarks into standardized hand events."""
    def __init__(self):
        self.prev_x = None
        self.prev_y = None

    def classify_hand(self, hand_pos, is_pinching=False):
        if not hand_pos:
            return {
                "event": "NONE",
                "x": 0.5,
                "y": 0.5,
                "is_pinching": False
            }

        x = hand_pos["x"]
        y = hand_pos["y"]

        event = "HAND_POSITION"
        if is_pinching:
            event = "COLLECT"
        elif self.prev_x is not None:
            dx = x - self.prev_x
            dy = y - self.prev_y

            if abs(dx) > 0.1 and abs(dx) > abs(dy):
                event = "HAND_RIGHT" if dx > 0 else "HAND_LEFT"
            elif abs(dy) > 0.1:
                event = "HAND_DOWN" if dy > 0 else "HAND_UP"

        self.prev_x = x
        self.prev_y = y

        return {
            "event": event,
            "x": x,
            "y": y,
            "is_pinching": is_pinching
        }
