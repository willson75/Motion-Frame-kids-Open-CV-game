import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, Smartphone, Video, Radio, Link2, X } from 'lucide-react';
import { fetchCameraDevices, selectCameraSource } from '../services/api';
import { sound } from '../services/soundEngine';
import '../styles/CameraModal.css';

export default function CameraModal({ isOpen, onClose, onCameraChanged }) {
  const [devices, setDevices] = useState([]);
  const [currentSource, setCurrentSource] = useState(0);
  const [ipUrl, setIpUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  useEffect(() => { if (isOpen) loadDevices(); }, [isOpen]);
  const loadDevices = async () => { setLoading(true); const data = await fetchCameraDevices(); setDevices(data.devices || []); setCurrentSource(data.current_source); setLoading(false); };
  const handleSelectDevice = async (source) => { sound.playClick(); setLoading(true); setStatusMsg('Switching camera feed…'); const res = await selectCameraSource(source); setLoading(false); if (res.success) { setCurrentSource(source); setStatusMsg(`Connected to ${typeof source === 'number' ? `Camera ${source}` : 'Mobile Stream'}!`); onCameraChanged?.(source); setTimeout(() => { setStatusMsg(null); onClose(); }, 1000); } else setStatusMsg(res.message || 'Failed to open camera'); };
  if (!isOpen) return null;
  return <div className="modal-overlay camera-modal-overlay"><div className="modal-content camera-command-deck">
    <button className="camera-close" onClick={onClose} aria-label="Close camera setup"><X size={18}/></button>
    <header className="camera-modal-header"><div className="camera-radar"><Radio size={24}/></div><div><div className="camera-kicker">Input control / 01</div><h2>Camera command deck</h2><p>Choose the lens that will track your next move.</p></div></header>
    <div className="camera-signal-row"><span><i/> System ready</span><span>Motion tracking</span><span>30 FPS target</span></div>
    {statusMsg && <div className="camera-message">{statusMsg}</div>}
    <section className="camera-source-section"><div className="camera-section-label"><span>Detected devices</span><button onClick={loadDevices}><RefreshCw size={14} className={loading ? 'spin' : ''}/> Rescan</button></div><div className="camera-device-list">
      {devices.length === 0 ? <div className="camera-empty">{loading ? 'Scanning for camera signals…' : 'No camera signals found.'}</div> : devices.map((dev) => <button key={dev.index} type="button" onClick={() => handleSelectDevice(dev.index)} className={`camera-device ${currentSource === dev.index ? 'selected' : ''}`}>
        <span className="device-icon">{dev.index === 0 ? <Video size={18}/> : <Smartphone size={18}/>}</span><span className="device-name">{dev.name}<small>{dev.index === 0 ? 'Built-in camera' : 'External feed'}</small></span>{currentSource === dev.index ? <span className="device-active"><Check size={14}/> Active</span> : <span className="device-select">Select</span>}
      </button>)}</div></section>
    <section className="ip-stream-panel"><div className="ip-stream-copy"><Link2 size={17}/><div><strong>Remote camera stream</strong><span>Use DroidCam, Iriun, or an IP Webcam feed.</span></div></div><form onSubmit={(e) => { e.preventDefault(); if (ipUrl.trim()) handleSelectDevice(ipUrl.trim()); }} className="ip-stream-form"><input type="text" className="modal-input" placeholder="e.g. http://192.168.1.50:4747/video" value={ipUrl} onChange={(e) => setIpUrl(e.target.value)}/><button type="submit" className="btn-amber">Connect</button></form></section>
    <footer className="camera-deck-footer"><span>Secure local connection</span><button className="btn-secondary" onClick={onClose}>Cancel</button></footer>
  </div></div>;
}
