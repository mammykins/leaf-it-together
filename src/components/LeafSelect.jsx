import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LEAF_SPECIES, drawLeaf } from '../data/leaves';

function LeafThumbnail({ species, selected, onClick, autumn }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 100 * dpr;
    canvas.height = 100 * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 100, 100);
    drawLeaf(ctx, species, 50, 50, 0.28, autumn);
  }, [species, autumn]);

  const stars = '★'.repeat(species.difficulty) + '☆'.repeat(5 - species.difficulty);

  return (
    <div
      className={`leaf-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        style={{ width: 100, height: 100, display: 'block', margin: '0 auto' }}
      />
      <div className="leaf-card-name">{species.name}</div>
      <div className="difficulty-stars">{stars}</div>
    </div>
  );
}

export default function LeafSelect({ onStart, onBack, autumn, onToggleAutumn }) {
  const [selectedId, setSelectedId] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');

  const selectedSpecies = LEAF_SPECIES.find((s) => s.id === selectedId);

  const handleStart = useCallback(() => {
    if (selectedSpecies) {
      onStart(selectedSpecies, difficulty);
    }
  }, [selectedSpecies, difficulty, onStart]);

  const handleSurprise = useCallback(() => {
    const randomSpecies =
      LEAF_SPECIES[Math.floor(Math.random() * LEAF_SPECIES.length)];
    const difficulties = ['easy', 'medium', 'hard'];
    const randomDifficulty =
      difficulties[Math.floor(Math.random() * difficulties.length)];
    onStart(randomSpecies, randomDifficulty);
  }, [onStart]);

  return (
    <div className="screen" style={{ gap: '1rem', padding: '1rem', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: 640, justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={onBack} style={{ fontSize: '0.95rem', padding: '0.4rem 1rem' }}>
          ← Back
        </button>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem',
            fontWeight: 700,
            color: 'var(--color-text)',
          }}
        >
          Choose a leaf
        </h2>
        <button
          className="btn-secondary"
          onClick={onToggleAutumn}
          style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}
          title="Toggle seasonal colours"
        >
          {autumn ? '🍂 Autumn' : '🌿 Summer'}
        </button>
      </div>

      <div className="leaf-grid">
        {LEAF_SPECIES.map((species) => (
          <LeafThumbnail
            key={species.id}
            species={species}
            selected={selectedId === species.id}
            onClick={() => setSelectedId(species.id)}
            autumn={autumn}
          />
        ))}
      </div>

      {selectedSpecies && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontStyle: 'italic',
            color: 'var(--color-text-light)',
            fontSize: '0.95rem',
          }}
        >
          {selectedSpecies.scientificName}
        </p>
      )}

      <div className="difficulty-selector">
        {['easy', 'medium', 'hard'].map((d) => (
          <button
            key={d}
            className={`difficulty-btn ${difficulty === d ? 'active' : ''}`}
            onClick={() => setDifficulty(d)}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          className="btn-primary"
          onClick={handleStart}
          disabled={!selectedSpecies}
          style={{ opacity: selectedSpecies ? 1 : 0.4 }}
        >
          Start puzzle
        </button>
        <button className="btn-secondary" onClick={handleSurprise}>
          🎲 Surprise me
        </button>
      </div>
    </div>
  );
}
