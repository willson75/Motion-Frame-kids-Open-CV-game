import React, { useState } from 'react';
import { User, Check } from 'lucide-react';
import { sound } from '../services/soundEngine';

export default function PlayerModal({ isOpen, onClose, playerName, setPlayerName, playerAvatar, setPlayerAvatar }) {
  const [nameInput, setNameInput] = useState(playerName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(playerAvatar || '🦊');

  const avatars = ['🦊', '🐯', '🚀', '🎮', '⚡', '👑', '🦄', '🐼'];

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      sound.playClick();
      setPlayerName(nameInput.trim());
      setPlayerAvatar(selectedAvatar);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>
          {selectedAvatar}
        </div>
        <h2>Who's Playing Today?</h2>
        <p style={{ color: '#A1A1AA', fontSize: '0.95rem', marginTop: '0.35rem' }}>
          Choose your mascot avatar and enter your player name!
        </p>

        {/* AVATAR PICKER */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '1.25rem 0 0.5rem 0' }}>
          {avatars.map((av) => (
            <button
              key={av}
              type="button"
              onClick={() => {
                sound.playClick();
                setSelectedAvatar(av);
              }}
              style={{
                fontSize: '1.6rem',
                background: selectedAvatar === av ? '#FFB800' : 'rgba(255,255,255,0.06)',
                border: selectedAvatar === av ? '2px solid #FFF' : '2px solid transparent',
                borderRadius: '14px',
                width: '46px',
                height: '46px',
                cursor: 'pointer',
                transition: 'transform 0.15s'
              }}
            >
              {av}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="modal-input"
            placeholder="Enter Player Name..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={15}
            autoFocus
          />

          <button type="submit" className="btn-amber" style={{ width: '100%', justifyContent: 'center' }}>
            <Check size={18} /> Ready to Play!
          </button>
        </form>
      </div>
    </div>
  );
}
