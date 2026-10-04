import React from 'react';
import { Camera, CheckCircle2, MoveLeft, MoveRight, ArrowUp, ArrowDown, UserCheck } from 'lucide-react';

export default function HowToPlay() {
  return (
    <div className="app-container">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>How To Play</h1>
        <p style={{ color: '#94A3B8', fontSize: '1.15rem' }}>
          Learn how MotionPlay detects your body and hand movements to control games!
        </p>
      </div>

      <div className="games-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="game-card">
          <div style={{ fontSize: '2.5rem', color: '#818CF8', marginBottom: '0.5rem' }}>1️⃣</div>
          <h3>Allow Camera Access</h3>
          <p className="game-desc">
            Ensure your webcam is connected and permission is granted. The status dot in the top bar will turn green when ready.
          </p>
        </div>

        <div className="game-card">
          <div style={{ fontSize: '2.5rem', color: '#38BDF8', marginBottom: '0.5rem' }}>2️⃣</div>
          <h3>Position Yourself</h3>
          <p className="game-desc">
            For hand games, sit comfortably in front of your camera. For <strong>Motion Runner</strong>, stand 4–6 feet back so your full body is visible.
          </p>
        </div>

        <div className="game-card">
          <div style={{ fontSize: '2.5rem', color: '#F59E0B', marginBottom: '0.5rem' }}>3️⃣</div>
          <h3>Complete Calibration</h3>
          <p className="game-desc">
            Before starting Motion Runner, stand naturally during the 2-second calibration count. The system measures your neutral stance.
          </p>
        </div>

        <div className="game-card">
          <div style={{ fontSize: '2.5rem', color: '#34D399', marginBottom: '0.5rem' }}>4️⃣</div>
          <h3>Move & Have Fun!</h3>
          <p className="game-desc">
            Lean left/right, jump, slide, or move your hands to interact directly with game objects in real-time.
          </p>
        </div>
      </div>

      {/* DETAILED CONTROLS GUIDE */}
      <div className="leaderboard-card">
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Motion Runner Pose Controls
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px' }}>
            <MoveLeft size={36} color="#38BDF8" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Lean Left</h4>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Moves character to Left Lane</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px' }}>
            <MoveRight size={36} color="#38BDF8" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Lean Right</h4>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Moves character to Right Lane</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px' }}>
            <ArrowUp size={36} color="#F59E0B" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Jump Upward</h4>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Character jumps over low barriers</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px' }}>
            <ArrowDown size={36} color="#EC4899" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Crouch Down</h4>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Character slides under overhead signs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
