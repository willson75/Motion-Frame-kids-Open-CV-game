import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, Home, Zap, Shield, Magnet, Play, CheckCircle2 } from 'lucide-react';
import { sound } from '../services/soundEngine';
import { submitScore } from '../services/api';
import { motionWS } from '../services/websocket';
import CameraPreview from '../components/CameraPreview';

export default function MotionRunner({ motionData, previewFrame, cameraActive, playerName, onBackToMenu }) {
  const canvasRef = useRef(null);

  // Game Phase States: 'CALIBRATION' | 'COUNTDOWN' | 'PLAYING' | 'GAMEOVER'
  const [phase, setPhase] = useState('CALIBRATION');
  const [calibProgress, setCalibProgress] = useState(0);
  const [calibComplete, setCalibComplete] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // HUD States
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speedMult, setSpeedMult] = useState(1.0);
  const [activePowerUp, setActivePowerUp] = useState(null);

  // Modals & High Score
  const [gameOver, setGameOver] = useState(false);
  const [isHighScore, setIsHighScore] = useState(false);

  // Game Engine State Ref
  const gameStateRef = useRef({
    lane: 1, // 0: Left, 1: Center, 2: Right
    targetLaneX: 450,
    currentLaneX: 450,

    playerY: 480,
    velocityY: 0,
    isJumping: false,
    isCrouching: false,
    crouchTimer: 0,

    score: 0,
    coins: 0,
    distance: 0,
    speedMultiplier: 1.0,

    activePowerUp: null, // { type: 'SHIELD'|'MAGNET'|'BOOST', timer: number }

    obstacles: [],
    collectibles: [],
    powerUpItems: [],
    particles: [],

    lastTime: performance.now(),
    keys: { left: false, right: false, up: false, down: false }
  });

  // Keyboard Override Listeners for Safety
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') changeLane(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') changeLane(1);
      if (e.key === 'ArrowUp' || e.key === 'w') triggerJump();
      if (e.key === 'ArrowDown' || e.key === 's') triggerCrouch();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const changeLane = (direction) => {
    const newLane = Math.max(0, Math.min(2, gameStateRef.current.lane + direction));
    if (newLane !== gameStateRef.current.lane) {
      gameStateRef.current.lane = newLane;
      sound.playClick();
    }
  };

  const triggerJump = () => {
    if (!gameStateRef.current.isJumping) {
      gameStateRef.current.isJumping = true;
      gameStateRef.current.velocityY = -16;
      sound.playJump();
    }
  };

  const triggerCrouch = () => {
    gameStateRef.current.isCrouching = true;
    gameStateRef.current.crouchTimer = 0.6; // slide duration in seconds
  };

  // Sync Motion Data from WebSocket
  useEffect(() => {
    if (motionData?.calibration) {
      setCalibProgress(motionData.calibration.progress || 0);
      if (motionData.calibration.is_calibrated && !calibComplete) {
        setCalibComplete(true);
      }
    }

    if (phase === 'PLAYING' && motionData?.pose?.detected) {
      const pose = motionData.pose;

      // Lane control
      if (pose.lane === 'LEFT') gameStateRef.current.lane = 0;
      else if (pose.lane === 'RIGHT') gameStateRef.current.lane = 2;
      else if (pose.lane === 'CENTER') gameStateRef.current.lane = 1;

      // Action control
      if (pose.action === 'JUMP') triggerJump();
      else if (pose.action === 'CROUCH') triggerCrouch();
    }
  }, [motionData, phase]);

  // Calibration Handler
  const startCalibrationProcess = () => {
    motionWS.startCalibration();
    setPhase('CALIBRATION');
  };

  // Start Countdown Routine
  const launchCountdown = () => {
    setPhase('COUNTDOWN');
    setCountdown(3);
    sound.playClick();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase('PLAYING');
          gameStateRef.current.lastTime = performance.now();
          return 0;
        }
        sound.playClick();
        return prev - 1;
      });
    }, 900);
  };

  // Main Motion Runner Engine Loop
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const lanePositions = [250, 450, 650]; // Left, Center, Right pixel X

    const spawnObstacle = () => {
      const laneIndex = Math.floor(Math.random() * 3);
      const types = [
        { type: 'BARRIER', require: 'JUMP', height: 40, width: 90, color: '#EF4444', label: 'LOW BARRIER' },
        { type: 'SIGN', require: 'CROUCH', height: 50, width: 95, color: '#F59E0B', label: 'OVERHEAD SIGN' },
        { type: 'CRATE', require: 'AVOID', height: 75, width: 85, color: '#8B5CF6', label: 'CRATE' }
      ];
      const selected = types[Math.floor(Math.random() * types.length)];
      gameStateRef.current.obstacles.push({
        lane: laneIndex,
        z: 0.05, // perspective depth 0.0 (far) to 1.0 (near)
        speed: 0.35 * gameStateRef.current.speedMultiplier,
        ...selected
      });
    };

    const spawnCollectible = () => {
      const laneIndex = Math.floor(Math.random() * 3);
      const isStar = Math.random() > 0.7;
      gameStateRef.current.collectibles.push({
        lane: laneIndex,
        z: 0.05,
        speed: 0.35 * gameStateRef.current.speedMultiplier,
        type: isStar ? 'STAR' : 'COIN',
        emoji: isStar ? '⭐' : '🪙',
        points: isStar ? 25 : 10
      });
    };

    const spawnPowerUpItem = () => {
      if (Math.random() > 0.2) return; // Rare spawn
      const laneIndex = Math.floor(Math.random() * 3);
      const pTypes = [
        { type: 'SHIELD', emoji: '🛡️', color: '#38BDF8' },
        { type: 'MAGNET', emoji: '🧲', color: '#F59E0B' },
        { type: 'BOOST', emoji: '⚡', color: '#10B981' }
      ];
      const p = pTypes[Math.floor(Math.random() * pTypes.length)];
      gameStateRef.current.powerUpItems.push({
        lane: laneIndex,
        z: 0.05,
        speed: 0.35 * gameStateRef.current.speedMultiplier,
        ...p
      });
    };

    let spawnTimer = 0;

    const render = (time) => {
      if (gameStateRef.current.gameOver) return;

      const dt = (time - gameStateRef.current.lastTime) / 1000;
      gameStateRef.current.lastTime = time;

      // Update Distance & Score
      gameStateRef.current.distance += Math.round(dt * 18 * gameStateRef.current.speedMultiplier);
      gameStateRef.current.score += Math.round(dt * 25 * gameStateRef.current.speedMultiplier);
      gameStateRef.current.speedMultiplier = Math.min(2.4, 1.0 + gameStateRef.current.distance / 400);

      setScore(gameStateRef.current.score);
      setDistance(gameStateRef.current.distance);
      setSpeedMult(roundTwo(gameStateRef.current.speedMultiplier));

      // Handle PowerUp Timer
      if (gameStateRef.current.activePowerUp) {
        gameStateRef.current.activePowerUp.timer -= dt;
        if (gameStateRef.current.activePowerUp.timer <= 0) {
          gameStateRef.current.activePowerUp = null;
          setActivePowerUp(null);
        }
      }

      // Smooth Lane Position Interpolation
      const targetX = lanePositions[gameStateRef.current.lane];
      gameStateRef.current.currentLaneX += (targetX - gameStateRef.current.currentLaneX) * 0.25;

      // Handle Jump Gravity
      if (gameStateRef.current.isJumping) {
        gameStateRef.current.playerY += gameStateRef.current.velocityY;
        gameStateRef.current.velocityY += 0.85; // Gravity
        if (gameStateRef.current.playerY >= 480) {
          gameStateRef.current.playerY = 480;
          gameStateRef.current.isJumping = false;
          gameStateRef.current.velocityY = 0;
        }
      }

      // Handle Crouch Duration
      if (gameStateRef.current.isCrouching) {
        gameStateRef.current.crouchTimer -= dt;
        if (gameStateRef.current.crouchTimer <= 0) {
          gameStateRef.current.isCrouching = false;
        }
      }

      // Clear Canvas
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Perspective 3-Lane Track Lines
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.4)';
      ctx.lineWidth = 3;

      const vanishX = 450;
      const vanishY = 180;

      // Lane Borders
      ctx.beginPath();
      ctx.moveTo(vanishX - 80, vanishY);
      ctx.lineTo(100, 600);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(vanishX - 25, vanishY);
      ctx.lineTo(330, 600);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(vanishX + 25, vanishY);
      ctx.lineTo(570, 600);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(vanishX + 80, vanishY);
      ctx.lineTo(800, 600);
      ctx.stroke();

      // Spawn Spurious Elements
      spawnTimer += dt * 1000;
      if (spawnTimer > 1100 / gameStateRef.current.speedMultiplier) {
        if (Math.random() > 0.4) spawnObstacle();
        else spawnCollectible();
        if (Math.random() > 0.7) spawnPowerUpItem();
        spawnTimer = 0;
      }

      // -------------------------------------------------------------
      // 1. UPDATE & DRAW OBSTACLES
      // -------------------------------------------------------------
      const obstacles = gameStateRef.current.obstacles;
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.z += obs.speed * dt;

        if (obs.z >= 1.0) {
          // Check Collision with Player
          const playerLane = gameStateRef.current.lane;
          if (obs.lane === playerLane) {
            let collided = false;

            if (obs.type === 'BARRIER' && !gameStateRef.current.isJumping) collided = true;
            else if (obs.type === 'SIGN' && !gameStateRef.current.isCrouching) collided = true;
            else if (obs.type === 'CRATE') collided = true;

            if (collided) {
              // Active Shield or Speed Boost protects player
              if (
                gameStateRef.current.activePowerUp?.type === 'SHIELD' ||
                gameStateRef.current.activePowerUp?.type === 'BOOST'
              ) {
                sound.playPowerUp();
                if (gameStateRef.current.activePowerUp.type === 'SHIELD') {
                  gameStateRef.current.activePowerUp = null;
                  setActivePowerUp(null);
                }
                obstacles.splice(i, 1);
                continue;
              }

              // COLLISION GAME OVER!
              sound.playCollision();
              triggerGameOver();
              return;
            }
          }

          obstacles.splice(i, 1);
          continue;
        }

        // Draw Obstacle with Depth Perspective
        const scale = obs.z;
        const obsX = vanishX + (lanePositions[obs.lane] - vanishX) * scale;
        const obsY = vanishY + (520 - vanishY) * scale;
        const obsW = obs.width * scale * 1.4;
        const obsH = obs.height * scale * 1.4;

        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 10 * scale;

        if (obs.type === 'SIGN') {
          // Overhead sign
          ctx.fillRect(obsX - obsW / 2, obsY - obsH - 40 * scale, obsW, obsH);
        } else {
          // Low Barrier / Crate
          ctx.fillRect(obsX - obsW / 2, obsY - obsH, obsW, obsH);
        }
        ctx.shadowBlur = 0;
      }

      // -------------------------------------------------------------
      // 2. UPDATE & DRAW COLLECTIBLES
      // -------------------------------------------------------------
      const collectibles = gameStateRef.current.collectibles;
      for (let i = collectibles.length - 1; i >= 0; i--) {
        const col = collectibles[i];
        col.z += col.speed * dt;

        // Magnet Power-Up draws coin into player lane
        if (gameStateRef.current.activePowerUp?.type === 'MAGNET' && col.z > 0.4) {
          col.lane = gameStateRef.current.lane;
        }

        if (col.z >= 0.95) {
          if (col.lane === gameStateRef.current.lane) {
            sound.playCoin();
            gameStateRef.current.coins += 1;
            gameStateRef.current.score += col.points;
            setCoins(gameStateRef.current.coins);
          }
          collectibles.splice(i, 1);
          continue;
        }

        const scale = col.z;
        const colX = vanishX + (lanePositions[col.lane] - vanishX) * scale;
        const colY = vanishY + (480 - vanishY) * scale;

        ctx.font = `${Math.max(16, Math.round(36 * scale))}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(col.emoji, colX, colY);
      }

      // -------------------------------------------------------------
      // 3. UPDATE & DRAW POWER-UP ITEMS
      // -------------------------------------------------------------
      const powerUps = gameStateRef.current.powerUpItems;
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const pw = powerUps[i];
        pw.z += pw.speed * dt;

        if (pw.z >= 0.95) {
          if (pw.lane === gameStateRef.current.lane) {
            sound.playPowerUp();
            gameStateRef.current.activePowerUp = { type: pw.type, timer: 6.0 };
            setActivePowerUp(pw.type);
          }
          powerUps.splice(i, 1);
          continue;
        }

        const scale = pw.z;
        const pwX = vanishX + (lanePositions[pw.lane] - vanishX) * scale;
        const pwY = vanishY + (480 - vanishY) * scale;

        ctx.font = `${Math.max(18, Math.round(40 * scale))}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(pw.emoji, pwX, pwY);
      }

      // -------------------------------------------------------------
      // 4. DRAW PLAYER CHARACTER
      // -------------------------------------------------------------
      const px = gameStateRef.current.currentLaneX;
      const py = gameStateRef.current.playerY;

      // Active PowerUp Aura / Shield Effect
      if (gameStateRef.current.activePowerUp) {
        ctx.strokeStyle =
          gameStateRef.current.activePowerUp.type === 'SHIELD'
            ? '#38BDF8'
            : gameStateRef.current.activePowerUp.type === 'MAGNET'
            ? '#F59E0B'
            : '#10B981';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(px, py - 30, 48, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Character Graphic (Dynamic crouch/jump height)
      const charH = gameStateRef.current.isCrouching ? 35 : 65;
      const charW = 40;

      ctx.fillStyle = '#38BDF8';
      ctx.shadowColor = '#818CF8';
      ctx.shadowBlur = 20;

      // Character Body Box
      ctx.beginPath();
      ctx.roundRect(px - charW / 2, py - charH, charW, charH, 14);
      ctx.fill();

      // Character Head
      if (!gameStateRef.current.isCrouching) {
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(px, py - charH - 12, 16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [phase]);

  const triggerGameOver = async () => {
    gameStateRef.current.gameOver = true;
    setPhase('GAMEOVER');
    setGameOver(true);
    sound.playHighScore();

    const finalScore = gameStateRef.current.score;
    const res = await submitScore({
      player_name: playerName || 'Player',
      game_name: 'motion_runner',
      score: finalScore,
      coins: gameStateRef.current.coins,
      distance: gameStateRef.current.distance
    });

    if (res.success) {
      setIsHighScore(true);
    }
  };

  const handleRestart = () => {
    gameStateRef.current = {
      lane: 1,
      targetLaneX: 450,
      currentLaneX: 450,
      playerY: 480,
      velocityY: 0,
      isJumping: false,
      isCrouching: false,
      crouchTimer: 0,
      score: 0,
      coins: 0,
      distance: 0,
      speedMultiplier: 1.0,
      activePowerUp: null,
      obstacles: [],
      collectibles: [],
      powerUpItems: [],
      particles: [],
      lastTime: performance.now(),
      keys: { left: false, right: false, up: false, down: false },
      gameOver: false
    };

    setScore(0);
    setCoins(0);
    setDistance(0);
    setSpeedMult(1.0);
    setActivePowerUp(null);
    setGameOver(false);
    setIsHighScore(false);
    launchCountdown();
  };

  function roundTwo(val) {
    return Math.round(val * 10) / 10;
  }

  return (
    <div className="app-container">
      <div className="game-viewport">
        {/* HUD OVERLAY */}
        {phase === 'PLAYING' && (
          <div className="game-hud">
            <div className="hud-pill">SCORE: {score}</div>
            <div className="hud-pill" style={{ color: '#F59E0B' }}>
              COINS: 🪙 {coins}
            </div>
            <div className="hud-pill" style={{ color: '#38BDF8' }}>
              DIST: {distance}m
            </div>
            <div className="hud-pill" style={{ color: '#34D399' }}>
              SPEED: {speedMult}x
            </div>
            {activePowerUp && (
              <div className="hud-pill" style={{ background: '#4F46E5', color: '#FFF' }}>
                {activePowerUp === 'SHIELD' ? '🛡️ SHIELD ACTIVE' : activePowerUp === 'MAGNET' ? '🧲 MAGNET ACTIVE' : '⚡ BOOST ACTIVE'}
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} width={900} height={600} className="game-canvas" />

        <CameraPreview previewFrame={previewFrame} cameraActive={cameraActive} motionData={motionData} />

        {/* 1. CALIBRATION MODAL */}
        {phase === 'CALIBRATION' && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '520px' }}>
              <div className="featured-badge" style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
                CAMERA CALIBRATION
              </div>
              <h2>Stand inside the frame</h2>
              <p style={{ color: '#94A3B8', margin: '0.75rem 0 1.5rem' }}>
                Position yourself 4–6 feet back from your webcam so your full body is visible. Stand naturally while we measure your baseline height and stance.
              </p>

              {/* Progress Bar */}
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', height: '14px', overflow: 'hidden', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: `${Math.round(calibProgress * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
                    transition: 'width 0.2s'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.9rem', color: calibComplete ? '#34D399' : '#FBBF24', fontWeight: '700', marginBottom: '1.5rem' }}>
                {calibComplete ? 'CALIBRATION COMPLETE ✓' : `Calibrating Stance... ${Math.round(calibProgress * 100)}%`}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                {!calibComplete ? (
                  <button className="btn-secondary" onClick={startCalibrationProcess}>
                    calibrate now
                  </button>
                ) : (
                  <button className="btn-primary" onClick={launchCountdown}>
                    <Play size={20} fill="#FFF" /> START GAME
                  </button>
                )}
                <button className="btn-secondary" onClick={launchCountdown} title="Skip calibration and start immediately">
                  Skip & Play
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. COUNTDOWN OVERLAY */}
        {phase === 'COUNTDOWN' && (
          <div className="modal-overlay">
            <div style={{ fontSize: '7rem', fontWeight: '900', color: '#FFF', textShadow: '0 0 40px #818CF8' }}>
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          </div>
        )}

        {/* 3. GAME OVER MODAL */}
        {phase === 'GAMEOVER' && (
          <div className="modal-overlay">
            <div className="modal-content">
              {isHighScore && <div style={{ fontSize: '1.2rem', color: '#F59E0B', fontWeight: '800' }}>🏆 NEW HIGH SCORE!</div>}
              <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>GAME OVER</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', margin: '1.5rem 0' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.85rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>SCORE</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#38BDF8' }}>{score}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.85rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>COINS</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#F59E0B' }}>🪙 {coins}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.85rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>DISTANCE</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#34D399' }}>{distance}m</div>
                </div>
              </div>

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
