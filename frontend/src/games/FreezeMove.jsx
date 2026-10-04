import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, Home, ShieldAlert, AlertTriangle } from 'lucide-react';
import { sound } from '../services/soundEngine';
import { submitScore } from '../services/api';
import CameraPreview from '../components/CameraPreview';

export default function FreezeMove({ motionData, previewFrame, cameraActive, playerName, onBackToMenu }) {
  const canvasRef = useRef(null);

  // States: 'MOVE' | 'FREEZE'
  const [stateMode, setStateMode] = useState('MOVE');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState(1);
  const [stateTimer, setStateTimer] = useState(5);
  const [warningMsg, setWarningMsg] = useState(null);
  const [gameOver, setGameOver] = useState(false);

  const gameStateRef = useRef({
    score: 0,
    lives: 3,
    round: 1,
    stateMode: 'MOVE',
    timer: 5,
    movementDelta: 0.0,
    lastTime: performance.now()
  });

  // Sync Motion Delta
  useEffect(() => {
    if (motionData?.pose?.movement_delta !== undefined) {
      gameStateRef.current.movementDelta = motionData.pose.movement_delta;
    }
  }, [motionData]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let modeClock = 0;

    const render = (time) => {
      if (gameOver) return;

      const dt = (time - gameStateRef.current.lastTime) / 1000;
      gameStateRef.current.lastTime = time;

      // Update Mode Timer
      modeClock += dt;
      if (modeClock >= 1.0) {
        gameStateRef.current.timer -= 1;
        setStateTimer(gameStateRef.current.timer);
        modeClock = 0;

        if (gameStateRef.current.timer <= 0) {
          // Switch state!
          if (gameStateRef.current.stateMode === 'MOVE') {
            gameStateRef.current.stateMode = 'FREEZE';
            gameStateRef.current.timer = Math.max(3, 6 - Math.floor(gameStateRef.current.round / 2));
            sound.playWhistle();
          } else {
            gameStateRef.current.stateMode = 'MOVE';
            gameStateRef.current.timer = 5;
            gameStateRef.current.round += 1;
            setRound(gameStateRef.current.round);
            sound.playClick();
          }
          setStateMode(gameStateRef.current.stateMode);
        }
      }

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Check Movement Rules
      if (gameStateRef.current.stateMode === 'MOVE') {
        // Gain points during MOVE
        gameStateRef.current.score += Math.round(dt * 30);
        setScore(gameStateRef.current.score);
      } else {
        // FREEZE state check
        if (gameStateRef.current.movementDelta > 0.045) {
          // MOVEMENT DETECTED DURING FREEZE!
          sound.playCollision();
          gameStateRef.current.lives -= 1;
          setLives(gameStateRef.current.lives);
          setWarningMsg('⚠️ MOVEMENT DETECTED! STICK TO FREEZE!');

          setTimeout(() => setWarningMsg(null), 1200);

          if (gameStateRef.current.lives <= 0) {
            triggerGameOver();
            return;
          }
        }
      }

      // Draw State Indicator Circle
      const isMove = gameStateRef.current.stateMode === 'MOVE';
      ctx.fillStyle = isMove ? '#10B981' : '#EF4444';
      ctx.shadowColor = isMove ? '#34D399' : '#F87171';
      ctx.shadowBlur = 30;

      ctx.beginPath();
      ctx.arc(450, 260, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Text Overlay
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 36px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isMove ? 'MOVE!' : 'FREEZE!', 450, 265);

      ctx.font = '22px Fredoka, sans-serif';
      ctx.fillText(`00:0${gameStateRef.current.timer}`, 450, 310);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver]);

  const triggerGameOver = async () => {
    setGameOver(true);
    sound.playHighScore();
    await submitScore({
      player_name: playerName || 'Player',
      game_name: 'freeze_move',
      score: gameStateRef.current.score,
      coins: gameStateRef.current.round,
      distance: 0
    });
  };

  const handleRestart = () => {
    gameStateRef.current = {
      score: 0,
      lives: 3,
      round: 1,
      stateMode: 'MOVE',
      timer: 5,
      movementDelta: 0.0,
      lastTime: performance.now()
    };
    setScore(0);
    setLives(3);
    setRound(1);
    setStateMode('MOVE');
    setGameOver(false);
  };

  return (
    <div className="app-container">
      <div className="game-viewport">
        <div className="game-hud">
          <div className="hud-pill">SCORE: {score}</div>
          <div className="hud-pill" style={{ color: '#F87171' }}>
            LIVES: {'❤️'.repeat(lives)}
          </div>
          <div className="hud-pill" style={{ color: '#38BDF8' }}>
            ROUND: {round}
          </div>
        </div>

        {warningMsg && (
          <div
            style={{
              position: 'absolute',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#EF4444',
              color: 'white',
              padding: '0.6rem 1.5rem',
              borderRadius: '999px',
              fontWeight: '800',
              zIndex: 30
            }}
          >
            {warningMsg}
          </div>
        )}

        <canvas ref={canvasRef} width={900} height={600} className="game-canvas" />

        <CameraPreview previewFrame={previewFrame} cameraActive={cameraActive} motionData={motionData} />

        {gameOver && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>GAME OVER</h2>
              <p style={{ fontSize: '1.4rem', color: '#38BDF8', fontWeight: '800' }}>FINAL SCORE: {score}</p>
              <p style={{ color: '#94A3B8', margin: '0.5rem 0 1.5rem' }}>Rounds Completed: {round}</p>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn-primary" onClick={handleRestart}>
                  <RotateCcw size={18} /> PLAY AGAIN
                </button>
                <button className="btn-secondary" onClick={onBackToMenu}>
                  <Home size={18} /> MAIN MENU
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
