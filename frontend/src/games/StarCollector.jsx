import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, Home } from 'lucide-react';
import { sound } from '../services/soundEngine';
import { submitScore } from '../services/api';
import CameraPreview from '../components/CameraPreview';

export default function StarCollector({ motionData, previewFrame, cameraActive, playerName, onBackToMenu }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [starsCollected, setStarsCollected] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const gameStateRef = useRef({
    handX: 0.5,
    handY: 0.5,
    stars: [],
    particles: [],
    score: 0,
    starsCollected: 0,
    timeLeft: 40,
    lastTime: performance.now()
  });

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gameStateRef.current.handX = (e.clientX - rect.left) / rect.width;
    gameStateRef.current.handY = (e.clientY - rect.top) / rect.height;
  };

  useEffect(() => {
    if (motionData?.hand?.detected && motionData?.hand?.pos) {
      gameStateRef.current.handX = motionData.hand.pos.x;
      gameStateRef.current.handY = motionData.hand.pos.y;
    }
  }, [motionData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const spawnStar = () => {
      gameStateRef.current.stars.push({
        x: Math.random() * (canvas.width - 120) + 60,
        y: Math.random() * (canvas.height - 140) + 70,
        radius: 22,
        life: 1.0, // Fades out over 3.5 seconds
        rotation: 0
      });
    };

    let spawnTimer = 0;
    let clockTimer = 0;

    const render = (time) => {
      if (gameOver) return;
      const dt = (time - gameStateRef.current.lastTime) / 1000;
      gameStateRef.current.lastTime = time;

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

      spawnTimer += dt * 1000;
      if (spawnTimer > 800 && gameStateRef.current.stars.length < 6) {
        spawnStar();
        spawnTimer = 0;
      }

      const handPxX = gameStateRef.current.handX * canvas.width;
      const handPxY = gameStateRef.current.handY * canvas.height;

      const stars = gameStateRef.current.stars;
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.life -= dt * 0.28;
        s.rotation += 0.03;

        if (s.life <= 0) {
          stars.splice(i, 1);
          continue;
        }

        // Draw Sparkling Star Shape
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = s.life;

        ctx.fillStyle = '#F59E0B';
        ctx.shadowColor = '#FBBF24';
        ctx.shadowBlur = 18;

        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          ctx.lineTo(Math.cos(((18 + k * 72) * Math.PI) / 180) * s.radius, -Math.sin(((18 + k * 72) * Math.PI) / 180) * s.radius);
          ctx.lineTo(Math.cos(((54 + k * 72) * Math.PI) / 180) * (s.radius / 2), -Math.sin(((54 + k * 72) * Math.PI) / 180) * (s.radius / 2));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Check Collision with Hand Pointer
        const dist = Math.hypot(handPxX - s.x, handPxY - s.y);
        if (dist <= s.radius + 18) {
          sound.playCoin();
          gameStateRef.current.score += 15;
          gameStateRef.current.starsCollected += 1;
          setScore(gameStateRef.current.score);
          setStarsCollected(gameStateRef.current.starsCollected);

          for (let p = 0; p < 10; p++) {
            gameStateRef.current.particles.push({
              x: s.x,
              y: s.y,
              vx: (Math.random() - 0.5) * 7,
              vy: (Math.random() - 0.5) * 7,
              color: '#FBBF24',
              life: 1.0
            });
          }

          stars.splice(i, 1);
        }
      }

      // Render Particles
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
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Hand Pointer
      ctx.fillStyle = '#EAB308';
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
      game_name: 'star_collector',
      score: gameStateRef.current.score,
      coins: gameStateRef.current.starsCollected,
      distance: 0
    });
  };

  const handleRestart = () => {
    gameStateRef.current = {
      handX: 0.5,
      handY: 0.5,
      stars: [],
      particles: [],
      score: 0,
      starsCollected: 0,
      timeLeft: 40,
      lastTime: performance.now()
    };
    setScore(0);
    setTimeLeft(40);
    setStarsCollected(0);
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
          <div className="hud-pill" style={{ color: '#F59E0B' }}>
            STARS: ⭐ {starsCollected}
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
              <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>GREAT JOB!</h2>
              <p style={{ fontSize: '1.4rem', color: '#38BDF8', fontWeight: '800' }}>FINAL SCORE: {score}</p>
              <p style={{ color: '#94A3B8', margin: '0.5rem 0 1.5rem' }}>Stars Collected: {starsCollected}</p>

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
