import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Home, Trophy, Volume2, VolumeX, Keyboard } from 'lucide-react';
import { sound } from '../services/soundEngine';
import { submitScore } from '../services/api';
import CameraPreview from '../components/CameraPreview';

export default function FruitCatch({ motionData, previewFrame, cameraActive, playerName, onBackToMenu }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isHighScore, setIsHighScore] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);

  // Game State Refs
  const gameStateRef = useRef({
    basketX: 0.5,
    fruits: [],
    particles: [],
    score: 0,
    lives: 3,
    combo: 0,
    speedMultiplier: 1.0,
    lastFrameTime: performance.now(),
    keys: { left: false, right: false }
  });

  // Keyboard Fallback Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        gameStateRef.current.keys.left = true;
        setManualOverride(true);
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        gameStateRef.current.keys.right = true;
        setManualOverride(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') gameStateRef.current.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') gameStateRef.current.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Sync Motion Data
  useEffect(() => {
    if (motionData?.hand?.detected && motionData?.hand?.pos && !manualOverride) {
      // Map normalized X (0.0 - 1.0) to basket position
      gameStateRef.current.basketX = motionData.hand.pos.x;
    }
  }, [motionData, manualOverride]);

  // Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const fruitTypes = [
      { emoji: '🍎', color: '#EF4444', points: 10 },
      { emoji: '🍊', color: '#F97316', points: 15 },
      { emoji: '🍌', color: '#EAB308', points: 20 },
      { emoji: '🍇', color: '#A855F7', points: 25 }
    ];

    const spawnFruit = () => {
      const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
      gameStateRef.current.fruits.push({
        x: Math.random() * (canvas.width - 60) + 30,
        y: -40,
        speed: (2.5 + Math.random() * 2) * gameStateRef.current.speedMultiplier,
        size: 36,
        ...type
      });
    };

    let spawnTimer = 0;

    const render = (time) => {
      if (gameOver) return;

      const dt = (time - gameStateRef.current.lastFrameTime) / 1000;
      gameStateRef.current.lastFrameTime = time;

      // Clear Canvas
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Handle Manual Keyboard Movement
      if (gameStateRef.current.keys.left) {
        gameStateRef.current.basketX = Math.max(0.08, gameStateRef.current.basketX - 0.025);
      }
      if (gameStateRef.current.keys.right) {
        gameStateRef.current.basketX = Math.min(0.92, gameStateRef.current.basketX + 0.025);
      }

      // Draw Basket
      const basketW = 110;
      const basketH = 30;
      const basketX = gameStateRef.current.basketX * canvas.width - basketW / 2;
      const basketY = canvas.height - 70;

      // Basket Glow & Body
      ctx.fillStyle = '#4F46E5';
      ctx.shadowColor = '#818CF8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(basketX, basketY, basketW, basketH, 12);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Basket Rim Accent
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(basketX + 5, basketY - 6, basketW - 10, 6);

      // Spawn Fruits
      spawnTimer += dt * 1000;
      if (spawnTimer > 1100 / gameStateRef.current.speedMultiplier) {
        spawnFruit();
        spawnTimer = 0;
      }

      // Update & Draw Fruits
      const currentFruits = [...gameStateRef.current.fruits];
      for (let i = currentFruits.length - 1; i >= 0; i--) {
        const f = currentFruits[i];
        f.y += f.speed;

        // Draw Fruit Emoji & Shadow
        ctx.font = '36px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.emoji, f.x, f.y);

        // Check Collision with Basket
        if (
          f.y + f.size / 2 >= basketY &&
          f.y - f.size / 2 <= basketY + basketH &&
          f.x >= basketX &&
          f.x <= basketX + basketW
        ) {
          // CATCH SUCCESS
          sound.playCatch();
          gameStateRef.current.score += f.points;
          gameStateRef.current.combo += 1;
          setScore(gameStateRef.current.score);
          setCombo(gameStateRef.current.combo);

          // Add Particle Effects
          for (let p = 0; p < 8; p++) {
            gameStateRef.current.particles.push({
              x: f.x,
              y: f.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: f.color,
              life: 1.0
            });
          }

          // Speed scaling
          gameStateRef.current.speedMultiplier = Math.min(2.5, 1.0 + gameStateRef.current.score / 200);

          gameStateRef.current.fruits.splice(i, 1);
          continue;
        }

        // Missed Fruit
        if (f.y > canvas.height + 20) {
          gameStateRef.current.combo = 0;
          gameStateRef.current.lives -= 1;
          setCombo(0);
          setLives(gameStateRef.current.lives);
          sound.playCollision();

          gameStateRef.current.fruits.splice(i, 1);

          if (gameStateRef.current.lives <= 0) {
            triggerGameOver();
            return;
          }
        }
      }

      // Render Particles
      const particles = gameStateRef.current.particles;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;

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

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver]);

  const triggerGameOver = async () => {
    setGameOver(true);
    sound.playHighScore();

    const finalScore = gameStateRef.current.score;
    const res = await submitScore({
      player_name: playerName || 'Player',
      game_name: 'fruit_catch',
      score: finalScore,
      coins: gameStateRef.current.combo,
      distance: 0
    });

    if (res.success) {
      setIsHighScore(true);
    }
  };

  const handleRestart = () => {
    gameStateRef.current = {
      basketX: 0.5,
      fruits: [],
      particles: [],
      score: 0,
      lives: 3,
      combo: 0,
      speedMultiplier: 1.0,
      lastFrameTime: performance.now(),
      keys: { left: false, right: false }
    };
    setScore(0);
    setLives(3);
    setCombo(0);
    setGameOver(false);
    setIsHighScore(false);
  };

  return (
    <div className="app-container">
      <div className="game-viewport">
        {/* HUD OVERLAY */}
        <div className="game-hud">
          <div className="hud-pill">SCORE: {score}</div>
          <div className="hud-pill" style={{ color: '#F87171' }}>
            LIVES: {'❤️'.repeat(lives)}
          </div>
          <div className="hud-pill" style={{ color: '#F59E0B' }}>
            COMBO: {combo}x
          </div>
        </div>

        <canvas ref={canvasRef} width={900} height={600} className="game-canvas" />

        <CameraPreview previewFrame={previewFrame} cameraActive={cameraActive} motionData={motionData} />

        {/* GAME OVER MODAL */}
        {gameOver && (
          <div className="modal-overlay">
            <div className="modal-content">
              {isHighScore && <div style={{ fontSize: '1.2rem', color: '#F59E0B', fontWeight: '800' }}>🏆 NEW HIGH SCORE!</div>}
              <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>GAME OVER</h2>
              <p style={{ fontSize: '1.3rem', color: '#38BDF8', fontWeight: '800' }}>FINAL SCORE: {score}</p>
              <p style={{ color: '#94A3B8', margin: '0.5rem 0 1.5rem' }}>Max Combo: {combo}x</p>

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
