import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PlayerModal from './components/PlayerModal';
import CameraModal from './components/CameraModal';
import Home from './pages/Home';
import GameSelection from './pages/GameSelection';
import LeaderboardPage from './pages/LeaderboardPage';
import HowToPlay from './pages/HowToPlay';

import FruitCatch from './games/FruitCatch';
import BalloonPop from './games/BalloonPop';
import StarCollector from './games/StarCollector';
import MotionRunner from './games/MotionRunner';
import FreezeMove from './games/FreezeMove';

import { motionWS } from './services/websocket';
import { fetchHealth, fetchGames } from './services/api';
import './styles/App.css';
import './styles/Theme.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedGame, setSelectedGame] = useState(null);
  const [games, setGames] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('motionplay_theme') || 'dark');

  // Player State
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('motionplay_player') || 'Alex');
  const [playerAvatar, setPlayerAvatar] = useState(() => localStorage.getItem('motionplay_avatar') || '🦊');
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Sensitivity State: 'ULTRA' | 'HIGH' | 'MEDIUM'
  const [sensitivity, setSensitivity] = useState(() => localStorage.getItem('motionplay_sensitivity') || 'ULTRA');

  // Camera & WebSocket State
  const [cameraActive, setCameraActive] = useState(false);
  const [previewFrame, setPreviewFrame] = useState(null);
  const [motionData, setMotionData] = useState(null);

  useEffect(() => {
    localStorage.setItem('motionplay_player', playerName);
    localStorage.setItem('motionplay_avatar', playerAvatar);
    localStorage.setItem('motionplay_sensitivity', sensitivity);
  }, [playerName, playerAvatar, sensitivity]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('motionplay_theme', theme);
  }, [theme]);

  useEffect(() => {
    loadInitialData();
    motionWS.setSensitivity(sensitivity);
    motionWS.connect();

    const unsubscribe = motionWS.subscribe((data) => {
      if (data.type === 'MOTION_UPDATE') {
        setCameraActive(data.camera_active);
        setPreviewFrame(data.preview_frame);
        setMotionData(data);
      } else if (data.type === 'CAMERA_STATUS') {
        setCameraActive(data.camera_active);
      }
    });

    return () => {
      unsubscribe();
      motionWS.disconnect();
    };
  }, []);

  const loadInitialData = async () => {
    const health = await fetchHealth();
    setCameraActive(health.camera_available);

    const gameList = await fetchGames();
    if (gameList && gameList.length > 0) {
      setGames(gameList);
    } else {
      setGames([
        { id: 'fruit_catch', title: 'Fruit Catch', description: 'Move hand to catch fruits.', difficulty: 'Easy', control_type: 'Hand Tracking', featured: false, icon: 'ðŸŽ' },
        { id: 'balloon_pop', title: 'Balloon Pop', description: 'Pop floating balloons.', difficulty: 'Easy', control_type: 'Hand Tracking', featured: false, icon: 'ðŸŽˆ' },
        { id: 'star_collector', title: 'Star Collector', description: 'Touch stars for score.', difficulty: 'Medium', control_type: 'Hand Tracking', featured: false, icon: 'â­' },
        { id: 'motion_runner', title: 'Motion Runner', description: '3-lane pose runner.', difficulty: 'Hard', control_type: 'Full Body Pose', featured: true, icon: 'ðŸƒ' },
        { id: 'freeze_move', title: 'Freeze & Move', description: 'Red-light / Green-light motion.', difficulty: 'Medium', control_type: 'Pose Motion', featured: false, icon: 'ðŸ§Š' }
      ]);
    }
  };

  const handleCycleSensitivity = () => {
    const nextSens = sensitivity === 'ULTRA' ? 'HIGH' : sensitivity === 'HIGH' ? 'MEDIUM' : 'ULTRA';
    setSensitivity(nextSens);
    motionWS.setSensitivity(nextSens);
  };

  const handleSelectGame = (gameId) => {
    setSelectedGame(gameId);
  };

  const handleBackToMenu = () => {
    setSelectedGame(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedGame(null);
          setActiveTab(tab);
        }}
        cameraActive={cameraActive}
        playerName={playerName}
        playerAvatar={playerAvatar}
        sensitivity={sensitivity}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        onCycleSensitivity={handleCycleSensitivity}
        onOpenPlayerModal={() => setIsPlayerModalOpen(true)}
        onOpenCameraModal={() => setIsCameraModalOpen(true)}
      />

      <main style={{ flex: 1 }}>
        {selectedGame === 'fruit_catch' && (
          <FruitCatch
            motionData={motionData}
            previewFrame={previewFrame}
            cameraActive={cameraActive}
            playerName={playerName}
            onBackToMenu={handleBackToMenu}
          />
        )}

        {selectedGame === 'balloon_pop' && (
          <BalloonPop
            motionData={motionData}
            previewFrame={previewFrame}
            cameraActive={cameraActive}
            playerName={playerName}
            onBackToMenu={handleBackToMenu}
          />
        )}

        {selectedGame === 'star_collector' && (
          <StarCollector
            motionData={motionData}
            previewFrame={previewFrame}
            cameraActive={cameraActive}
            playerName={playerName}
            onBackToMenu={handleBackToMenu}
          />
        )}

        {selectedGame === 'motion_runner' && (
          <MotionRunner
            motionData={motionData}
            previewFrame={previewFrame}
            cameraActive={cameraActive}
            playerName={playerName}
            onBackToMenu={handleBackToMenu}
          />
        )}

        {selectedGame === 'freeze_move' && (
          <FreezeMove
            motionData={motionData}
            previewFrame={previewFrame}
            cameraActive={cameraActive}
            playerName={playerName}
            onBackToMenu={handleBackToMenu}
          />
        )}

        {!selectedGame && activeTab === 'home' && (
          <Home
            onSelectGame={handleSelectGame}
            setActiveTab={setActiveTab}
            sensitivity={sensitivity}
            onCycleSensitivity={handleCycleSensitivity}
            onOpenCameraModal={() => setIsCameraModalOpen(true)}
          />
        )}

        {!selectedGame && activeTab === 'games' && (
          <GameSelection games={games} onSelectGame={handleSelectGame} />
        )}

        {!selectedGame && activeTab === 'leaderboard' && <LeaderboardPage />}

        {!selectedGame && activeTab === 'tutorial' && <HowToPlay />}
      </main>

      {/* HUMANIZED HANDCRAFTED FOOTER */}
      <footer style={{ borderTop: '1px solid var(--line)', padding: '1.25rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem', marginTop: '3rem' }}>
        <div>MotionPlay · A webcam motion-gaming project</div>
        <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
          Built with React, OpenCV and MediaPipe
        </div>
      </footer>

      <PlayerModal
        isOpen={isPlayerModalOpen}
        onClose={() => setIsPlayerModalOpen(false)}
        playerName={playerName}
        setPlayerName={setPlayerName}
        playerAvatar={playerAvatar}
        setPlayerAvatar={setPlayerAvatar}
      />

      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCameraChanged={() => loadInitialData()}
      />
    </div>
  );
}



