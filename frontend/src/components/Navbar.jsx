import React, { useState } from 'react';
import { VideoOff, Zap, Volume2, VolumeX, Camera, Moon, Sun } from 'lucide-react';
import { sound } from '../services/soundEngine';

export default function Navbar({ activeTab, setActiveTab, cameraActive, playerName, playerAvatar = '🦊', sensitivity, onCycleSensitivity, onOpenPlayerModal, onOpenCameraModal, theme, onToggleTheme }) {
  const [isMuted, setIsMuted] = useState(sound.isMuted);
  const toggleSound = () => { sound.isMuted = !sound.isMuted; setIsMuted(sound.isMuted); if (!sound.isMuted) sound.playClick(); };
  const navigate = (tab) => { sound.playClick(); setActiveTab(tab); };
  return <nav className="navbar">
    <div className="nav-brand" onClick={() => navigate('home')}><span className="nav-brand-mark">M</span><span className="nav-brand-text">MOTIONPLAY</span></div>
    <div className="nav-links">{[['home','Home'],['games','Games'],['leaderboard','Leaderboard'],['tutorial','Getting started']].map(([id,label]) => <button key={id} className={`nav-btn ${activeTab === id ? 'active' : ''}`} onClick={() => navigate(id)}>{label}</button>)}</div>
    <div className="nav-actions">
      <button className="utility-btn theme-toggle" onClick={onToggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        {theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
      <button className="utility-btn" onClick={toggleSound} title={isMuted ? 'Unmute sound' : 'Mute sound'}>{isMuted ? <VolumeX size={15}/> : <Volume2 size={15}/>}<span>{isMuted ? 'Muted' : 'Sound'}</span></button>
      <button className="sensitivity-pill" onClick={() => { sound.playClick(); onCycleSensitivity(); }} title="Change motion sensitivity"><Zap size={14}/><span>{sensitivity}</span></button>
      <button className={`camera-status-pill ${cameraActive ? '' : 'error'}`} onClick={() => { sound.playClick(); onOpenCameraModal(); }} title="Choose camera"><span className="dot" />{cameraActive ? <Camera size={14}/> : <VideoOff size={14}/>}<span>{cameraActive ? 'Camera' : 'Set camera'}</span></button>
      <button className="player-avatar-btn" onClick={onOpenPlayerModal}><span>{playerAvatar}</span><span>{playerName || 'Profile'}</span></button>
    </div>
  </nav>;
}
