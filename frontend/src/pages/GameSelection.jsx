import React from 'react';
import { Play, Sparkles, ScanLine, Trophy } from 'lucide-react';
import { sound } from '../services/soundEngine';
import '../styles/GameLibrary.css';
export default function GameSelection({ games, onSelectGame }) {
  return <div className="app-container">
    <div className="page-intro game-library-intro">
      <div><div className="eyebrow">Game library / season 01</div><h1>Choose your<br/><span>next run.</span></h1><p>Quick sessions built around real movement. Pick a mode, clear a little space, and let the camera become your controller.</p></div>
      <div className="library-status"><span><ScanLine size={16}/> Motion controls</span><strong>ONLINE</strong></div>
    </div>
    <div className="library-strip"><div><Sparkles size={18}/><span><strong>{games.length || 5} modes</strong><small>Ready to play</small></span></div><div><Trophy size={18}/><span><strong>High-score chase</strong><small>Every run counts</small></span></div><p>Tip: Full-body games feel best with a little extra room behind you.</p></div>
    <div className="games-grid game-library-grid">{games.map((g, index) => <article key={g.id} className="game-card game-library-card">
      <div className="game-card-top"><span className="game-number">0{index + 1}</span>{g.featured && <div className="featured-badge">Featured mode</div>}</div>
      <div className="game-icon">{g.icon}</div><h3 className="game-title">{g.title}</h3><p className="game-desc">{g.description}</p>
      <div className="game-meta"><span>INPUT <strong>{g.control_type}</strong></span><span>DIFFICULTY <strong>{g.difficulty}</strong></span></div>
      <button className="btn-primary" onClick={() => { sound.playClick(); onSelectGame(g.id); }}><Play size={15} fill="currentColor"/> Launch game</button>
    </article>)}</div>
  </div>;
}
