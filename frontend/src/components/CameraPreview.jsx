import React, { useState } from 'react';
import { Eye, EyeOff, Camera, Hand, ScanLine } from 'lucide-react';

export default function CameraPreview({ previewFrame, cameraActive, motionData }) {
  const [isVisible, setIsVisible] = useState(true);
  const hand = motionData?.hand;
  const landmarkCount = hand?.landmarks?.length || 0;

  if (!cameraActive) {
    return <div className="camera-overlay-panel tracking-console is-offline"><Camera size={19}/><div><strong>Camera unavailable</strong><span>Select a camera to begin tracking.</span></div></div>;
  }

  return <div className="camera-overlay-panel tracking-console">
    <div className="tracking-console-head"><div><ScanLine size={14}/><span>Live tracking</span></div><button onClick={() => setIsVisible(!isVisible)} title={isVisible ? 'Hide camera preview' : 'Show camera preview'}>{isVisible ? <EyeOff size={14}/> : <Eye size={14}/>}</button></div>
    {isVisible && <>{previewFrame ? <img src={previewFrame} alt="Webcam preview with tracking landmarks" className="camera-preview-img"/> : <div className="camera-preview-loading">Starting camera…</div>}<div className="tracking-status"><span className={hand?.detected ? 'is-ready' : ''}><Hand size={13}/> {hand?.detected ? `Hand detected · ${landmarkCount}/21` : 'Looking for hand'}</span><span className={hand?.is_pinching ? 'is-pinch' : ''}>{hand?.is_pinching ? 'Pinch active' : 'Index cursor'}</span></div><p className="tracking-hint">Keep your index finger inside the frame. The dots show the live hand landmarks.</p></>}
  </div>;
}
