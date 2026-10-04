import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, Home } from 'lucide-react';
import { sound } from '../services/soundEngine';
import { submitScore } from '../services/api';
import CameraPreview from '../components/CameraPreview';

export default function BalloonPop({ motionData, previewFrame, cameraActive, playerName, onBackToMenu }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const gameStateRef = useRef({
    handX: 0.5,
    handY: 0.5,
    balloons: [],
    particles: [],
    score: 0,
    combo: 0,
    timeLeft: 45,
    lastTime: performance.now()
  });

  // Track Mouse Fallback
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gameStateRef.current.handX = (e.clientX - rect.left) / rect.width;
    gameStateRef.current.handY = (e.clientY - rect.top) / rect.height;
  };

  // Sync Motion Data
  useEffect(() => {
    if (motionData?.hand?.detected && motionData?.hand?.pos) {
      gameStateRef.current.handX = motionData.hand.pos.x;
      gameStateRef.current.handY = motionData.hand.pos.y;
    }
  }, [motionData]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

    const spawnBalloon = () => {
      gameStateRef.current.balloons.push({
        x: Math.random() * (canvas.width - 80) + 40,
        y: canvas.height + 40,
        radius: 28 + Math.random() * 12,
        speed: 1.8 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    };

    let spawnTimer = 0;
    let clockTimer = 0;

    const render = (time) => {
      if (gameOver) return;
      const dt = (time - gameStateRef.current.lastTime) / 1000;
      gameStateRef.current.lastTime = time;

      // Update Timer
      clockTimer += dt;
      if (clockTimer >= 1.0) {
        gameStateRef.current.timeLeft -= 1;
        setTimeLeft(gameStateRef.current.timeLeft);
        clockTimer = 0;

        if (gameStateRef.current.timeLeft <= 0) {
          triggerGameOver();
          return;
        }
      }

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spawn balloons
      spawnTimer += dt * 1000;
      if (spawnTimer > 700) {
        spawnBalloon();
        spawnTimer = 0;
      }

      // Hand Pointer Coordinates
      const handPxX = gameStateRef.current.handX * canvas.width;
      const handPxY = gameStateRef.current.handY * canvas.height;

      // Update & Draw Balloons
      const balloons = gameStateRef.current.balloons;
      for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        b.y -= b.speed;

        // Draw Balloon Body & String
        ctx.beginPath();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 12;
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw String
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.radius);
        ctx.lineTo(b.x, b.y + b.radius + 18);
        ctx.stroke();

        // Check Overlap with Hand Pointer
        const dist = Math.hypot(handPxX - b.x, handPxY - b.y);
        if (dist <= b.radius + 15) {
          // POP BALLOON!
          sound.playPop();
          gameStateRef.current.score += 10;
          gameStateRef.current.combo += 1;
          setScore(gameStateRef.current.score);
          setCombo(gameStateRef.current.combo);

          // Particles
          for (let p = 0; p < 12; p++) {
            gameStateRef.current.particles.push({
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              color: b.color,
              life: 1.0
            });
          }

          balloons.splice(i, 1);
          continue;
        }

        if (b.y < -50) {
          balloons.splice(i, 1);
        }
      }

      // Draw Particles
      const particles = gameStateRef.current.particles;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Draw Hand Crosshair / Pointer
      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(handPxX, handPxY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

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
      game_name: 'balloon_pop',
      score: gameStateRef.current.score,
      coins: gameStateRef.current.combo,
      distance: 0
    });
  };

  const handleRestart = () => {
    gameStateRef.current = {
      handX: 0.5,
      handY: 0.5,
      balloons: [],
      particles: [],
      score: 0,
      combo: 0,
      timeLeft: 45,
      lastTime: performance.now()
    };
    setScore(0);
    setTimeLeft(45);
    setCombo(0);
    setGameOver(false);
  };

  return (
    <div className="app-container">
      <div className="game-viewport">
        <div className="game-hud">
          <div className="hud-pill">SCORE: {score}</div>
          <div className="hud-pill" style={{ color: '#FBBF24' }}>
            TIME: {timeLeft}s
          </div>
          <div className="hud-pill" style={{ color: '#EC4899' }}>
            POPPED: {combo}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={900}
          height={600}
          className="game-canvas"
          onMouseMove={handleMouseMove}
        />

        <CameraPreview previewFrame={previewFrame} cameraActive={cameraActive} motionData={motionData} />

        {gameOver && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>TIME'S UP!</h2>
              <p style={{ fontSize: '1.4rem', color: '#38BDF8', fontWeight: '800' }}>FINAL SCORE: {score}</p>
              <p style={{ color: '#94A3B8', margin: '0.5rem 0 1.5rem' }}>Balloons Popped: {combo}</p>

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
