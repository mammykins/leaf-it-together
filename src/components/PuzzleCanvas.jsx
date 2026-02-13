import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { generateFragments, scatterFragments, checkSnap, snapFragment } from '../engine/fracture';
import { hitTestFragment } from '../engine/geometry';
import { drawLeaf, drawFragment } from '../data/leaves';

const SNAP_DISTANCE = 35;
const SNAP_ANGLE = 0.4;
const ROTATE_STEP = Math.PI / 2; // 90° increments

export default function PuzzleCanvas({
  species,
  difficulty,
  autumn,
  onVictory,
  onBack,
  isVictory,
  finalTime,
  onPlayAgain,
  onNewLeaf,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fragmentsRef = useRef([]);
  const draggingRef = useRef(null); // { fragmentId, offsetX, offsetY }
  const leafOriginRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  const [placedCount, setPlacedCount] = useState(0);
  const [totalFragments, setTotalFragments] = useState(0);
  const [showGhost, setShowGhost] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const [puzzleSeed, setPuzzleSeed] = useState(() => Date.now());

  // Format time as M:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Initialize puzzle
  const initPuzzle = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const cw = rect.width;
    const ch = rect.height;

    // Scale leaf to fit nicely (use ~50% of smaller dimension)
    const leafNativeSize = 400; // approximate extent of leaf coordinates
    const fitSize = Math.min(cw, ch) * 0.45;
    const scale = fitSize / leafNativeSize;
    scaleRef.current = scale;

    // Center the leaf in the canvas
    const leafOrigin = { x: cw / 2, y: ch / 2 };
    leafOriginRef.current = leafOrigin;

    // Generate leaf outline
    const outline = species.generateOutline();

    // Generate fragments
    const fragments = generateFragments(outline, difficulty, puzzleSeed);

    // Scatter fragments around the canvas
    scatterFragments(fragments, cw, ch, leafOrigin, scale);

    fragmentsRef.current = fragments;
    setTotalFragments(fragments.length);
    setPlacedCount(0);
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    // Start timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    render();
  }, [species, difficulty, puzzleSeed]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Initialize on mount and when deps change
  useEffect(() => {
    initPuzzle();

    const handleResize = () => initPuzzle();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initPuzzle]);

  // Render the canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = '#ebe4d4';
    ctx.fillRect(0, 0, cw, ch);

    // Subtle grid pattern for the "bench" feel
    ctx.strokeStyle = 'rgba(180, 160, 130, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < cw; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }

    const leafOrigin = leafOriginRef.current;
    const scale = scaleRef.current;

    // Ghost outline
    if (showGhost) {
      drawLeaf(ctx, species, leafOrigin.x, leafOrigin.y, scale, autumn, 0.1);
    }

    // Draw placed fragments first (lower z), then unplaced
    const fragments = fragmentsRef.current;
    const sorted = [...fragments].sort((a, b) => {
      if (a.isPlaced !== b.isPlaced) return a.isPlaced ? -1 : 1;
      return a.zIndex - b.zIndex;
    });

    for (const frag of sorted) {
      drawFragment(ctx, frag, species, leafOrigin.x, leafOrigin.y, scale, autumn);
    }

    // Highlight dragged fragment
    if (draggingRef.current != null) {
      const dragFrag = fragments.find((f) => f.id === draggingRef.current.fragmentId);
      if (dragFrag) {
        // Draw a subtle highlight around the dragged piece
        ctx.save();
        ctx.translate(dragFrag.currentPosition.x, dragFrag.currentPosition.y);
        ctx.rotate(dragFrag.rotation);
        ctx.beginPath();
        dragFrag.polygon.forEach((v, i) => {
          const x = (v.x - dragFrag.centroid.x) * scale;
          const y = (v.y - dragFrag.centroid.y) * scale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.strokeStyle = 'rgba(184, 92, 56, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [species, autumn, showGhost]);

  // Re-render when showGhost changes
  useEffect(() => {
    render();
  }, [render]);

  // Get canvas-relative coordinates from event
  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Find topmost unplaced fragment at a point
  const findFragment = useCallback(
    (pos) => {
      const fragments = fragmentsRef.current;
      const scale = scaleRef.current;

      // Check in reverse z-order (topmost first)
      const sorted = [...fragments]
        .filter((f) => !f.isPlaced)
        .sort((a, b) => b.zIndex - a.zIndex);

      for (const frag of sorted) {
        // Scale the fragment polygon for hit testing
        const scaledFrag = {
          ...frag,
          polygon: frag.polygon.map((v) => ({
            x: v.x * scale,
            y: v.y * scale,
          })),
          centroid: {
            x: frag.centroid.x * scale,
            y: frag.centroid.y * scale,
          },
          currentPosition: frag.currentPosition,
          rotation: frag.rotation,
        };

        if (hitTestFragment(pos, scaledFrag)) {
          return frag;
        }
      }
      return null;
    },
    []
  );

  // Pointer down
  const handlePointerDown = useCallback(
    (e) => {
      if (isVictory) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      const frag = findFragment(pos);
      if (frag) {
        // Bring to top
        const maxZ = Math.max(...fragmentsRef.current.map((f) => f.zIndex));
        frag.zIndex = maxZ + 1;

        draggingRef.current = {
          fragmentId: frag.id,
          offsetX: pos.x - frag.currentPosition.x,
          offsetY: pos.y - frag.currentPosition.y,
        };
        render();
      }
    },
    [getCanvasPos, findFragment, render, isVictory]
  );

  // Pointer move
  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      const frag = fragmentsRef.current.find(
        (f) => f.id === draggingRef.current.fragmentId
      );
      if (frag) {
        frag.currentPosition = {
          x: pos.x - draggingRef.current.offsetX,
          y: pos.y - draggingRef.current.offsetY,
        };
        render();
      }
    },
    [getCanvasPos, render]
  );

  // Pointer up — check snap
  const handlePointerUp = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      e.preventDefault();

      const frag = fragmentsRef.current.find(
        (f) => f.id === draggingRef.current.fragmentId
      );
      draggingRef.current = null;

      if (frag) {
        const leafOrigin = leafOriginRef.current;
        const scale = scaleRef.current;

        // Adjust snap check for scale
        const scaledLeafOrigin = {
          x: leafOrigin.x,
          y: leafOrigin.y,
        };

        // Check snap with scaled positions
        const targetX = leafOrigin.x + frag.centroid.x * scale;
        const targetY = leafOrigin.y + frag.centroid.y * scale;
        const dx = frag.currentPosition.x - targetX;
        const dy = frag.currentPosition.y - targetY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let rot = frag.rotation % (Math.PI * 2);
        if (rot < 0) rot += Math.PI * 2;
        const angleOk = rot < SNAP_ANGLE || rot > Math.PI * 2 - SNAP_ANGLE;

        if (distance < SNAP_DISTANCE && angleOk) {
          // Snap!
          frag.currentPosition = { x: targetX, y: targetY };
          frag.rotation = 0;
          frag.isPlaced = true;

          const newPlaced = fragmentsRef.current.filter((f) => f.isPlaced).length;
          setPlacedCount(newPlaced);

          // Check victory
          if (newPlaced === fragmentsRef.current.length) {
            if (timerRef.current) clearInterval(timerRef.current);
            const time = Math.floor((Date.now() - startTimeRef.current) / 1000);
            onVictory(time);
          }
        }
      }

      render();
    },
    [render, onVictory]
  );

  // Keyboard: R to rotate, G to toggle ghost
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (draggingRef.current) {
          const frag = fragmentsRef.current.find(
            (f) => f.id === draggingRef.current.fragmentId
          );
          if (frag) {
            frag.rotation += ROTATE_STEP;
            render();
          }
        }
      }
      if (e.key === 'g' || e.key === 'G') {
        setShowGhost((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [render]);

  // Scroll wheel to rotate selected piece
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      if (draggingRef.current) {
        e.preventDefault();
        const frag = fragmentsRef.current.find(
          (f) => f.id === draggingRef.current.fragmentId
        );
        if (frag) {
          frag.rotation += e.deltaY > 0 ? ROTATE_STEP : -ROTATE_STEP;
          render();
        }
      }
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [render]);

  // Handle restart
  const handleRestart = useCallback(() => {
    setPuzzleSeed(Date.now());
  }, []);

  // Rotate button (for mobile)
  const handleRotateBtn = useCallback(() => {
    // Rotate the most recently interacted unplaced piece
    const unplaced = fragmentsRef.current
      .filter((f) => !f.isPlaced)
      .sort((a, b) => b.zIndex - a.zIndex);
    if (unplaced.length > 0) {
      unplaced[0].rotation += ROTATE_STEP;
      render();
    }
  }, [render]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* HUD */}
      <div className="puzzle-hud">
        <div className="hud-left">
          <button
            className="btn-secondary"
            onClick={onBack}
            style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}
          >
            ← Back
          </button>
          <button
            className="btn-secondary"
            onClick={handleRestart}
            style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}
          >
            ↻ Restart
          </button>
        </div>

        <div className="hud-center">
          <div className="species-label" style={{ fontSize: '1.4rem' }}>
            {species.name}
          </div>
          <div className="species-scientific">{species.scientificName}</div>
        </div>

        <div className="hud-right">
          <span className="piece-counter">
            {placedCount} / {totalFragments}
          </span>
          <span className="timer">{formatTime(elapsedTime)}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="puzzle-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          style={{ cursor: draggingRef.current ? 'grabbing' : 'grab' }}
        />

        {/* Victory overlay */}
        {isVictory && (
          <div className="victory-overlay">
            <div className="victory-title">Lovely!</div>
            <div className="species-label">{species.name}</div>
            <div className="species-scientific" style={{ marginTop: '0.25rem' }}>
              {species.scientificName}
            </div>
            <p className="fun-fact">{species.funFact}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
              Time: {formatTime(finalTime)}
            </p>
            <div className="victory-buttons">
              <button className="btn-primary" onClick={onPlayAgain}>
                Play again
              </button>
              <button className="btn-secondary" onClick={onNewLeaf}>
                New leaf
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="controls-hint">
        <span>Drag pieces into place · </span>
        <span>
          <strong>Scroll</strong> or <strong>R</strong> to rotate ·{' '}
        </span>
        <span>
          <strong>G</strong> to toggle guide ·{' '}
        </span>
        <button
          onClick={handleRotateBtn}
          style={{
            display: 'inline',
            background: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: '0.8rem',
            color: 'var(--color-accent)',
            textDecoration: 'underline',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          Rotate top piece
        </button>
      </div>
    </div>
  );
}
