import React from 'react';

export default function TitleScreen({ onPlay }) {
  return (
    <div className="screen" style={{ gap: '1.5rem', background: 'var(--color-bg)' }}>
      {/* Decorative falling leaves */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0.12,
        }}
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${10 + i * 12}%`,
              top: `${-10 + (i % 3) * 5}%`,
              fontSize: `${1.5 + (i % 3) * 0.8}rem`,
              animation: `fall ${6 + i * 1.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          >
            🍂
          </div>
        ))}
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3rem, 10vw, 5rem)',
          fontWeight: 700,
          color: 'var(--color-text)',
          lineHeight: 1.1,
          textAlign: 'center',
        }}
      >
        Leaf It
        <br />
        Together
      </h1>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1.15rem',
          fontStyle: 'italic',
          color: 'var(--color-text-light)',
          fontWeight: 300,
        }}
      >
        Piece nature back together
      </p>

      <div style={{ height: '1rem' }} />

      <button className="btn-primary" onClick={onPlay}>
        Play
      </button>

      <p
        style={{
          position: 'absolute',
          bottom: '1.5rem',
          fontSize: '0.8rem',
          color: 'var(--color-text-light)',
          fontStyle: 'italic',
          opacity: 0.6,
        }}
      >
        A game born on a park bench in Autumn
      </p>

      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
