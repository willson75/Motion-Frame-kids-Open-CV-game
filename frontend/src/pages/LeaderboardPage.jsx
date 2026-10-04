import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Flame } from 'lucide-react';
import { fetchLeaderboard } from '../services/api';

export default function LeaderboardPage() {
  const [selectedGame, setSelectedGame] = useState('ALL');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'ALL', label: '🏆 All Games' },
    { id: 'motion_runner', label: '🏃 Motion Runner' },
    { id: 'fruit_catch', label: '🍎 Fruit Catch' },
    { id: 'balloon_pop', label: '🎈 Balloon Pop' },
    { id: 'star_collector', label: '⭐ Star Collector' },
    { id: 'freeze_move', label: '🧊 Freeze & Move' }
  ];

  useEffect(() => {
    loadLeaderboard();
  }, [selectedGame]);

  const loadLeaderboard = async () => {
    setLoading(true);
    const data = await fetchLeaderboard(selectedGame);
    setScores(data);
    setLoading(false);
  };

  return (
    <div className="app-container">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Global Leaderboard</h1>
        <p style={{ color: '#94A3B8', fontSize: '1.15rem' }}>
          Top scores achieved by players across webcam-controlled motion games!
        </p>
      </div>

      <div className="leaderboard-card">
        <div className="filter-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${selectedGame === t.id ? 'active' : ''}`}
              onClick={() => setSelectedGame(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
            Loading scores...
          </div>
        ) : scores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
            No scores recorded yet. Be the first to set a high score!
          </div>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Player</th>
                <th>Game</th>
                <th>Score</th>
                <th>Coins / Distance</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, index) => (
                <tr key={s.id || index}>
                  <td>
                    <span className={`rank-badge ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : ''}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td style={{ color: '#FFF' }}>{s.player_name}</td>
                  <td style={{ textTransform: 'capitalize', color: '#38BDF8' }}>
                    {s.game_name ? s.game_name.replace('_', ' ') : 'N/A'}
                  </td>
                  <td style={{ color: '#F59E0B', fontSize: '1.2rem', fontWeight: '800' }}>
                    {s.score.toLocaleString()}
                  </td>
                  <td style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
                    {s.coins ? `🪙 ${s.coins}` : ''} {s.distance ? ` 🏃 ${s.distance}m` : ''}
                    {!s.coins && !s.distance ? '—' : ''}
                  </td>
                  <td style={{ color: '#64748B', fontSize: '0.85rem' }}>
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Today'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
