import React, { useState, useCallback } from 'react';
import TitleScreen from './components/TitleScreen';
import LeafSelect from './components/LeafSelect';
import PuzzleCanvas from './components/PuzzleCanvas';

export default function App() {
  const [phase, setPhase] = useState('title'); // title | select | playing | victory
  const [species, setSpecies] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [finalTime, setFinalTime] = useState(0);
  const [autumn, setAutumn] = useState(true);

  const handlePlay = useCallback(() => setPhase('select'), []);

  const handleStartPuzzle = useCallback(
    (selectedSpecies, selectedDifficulty) => {
      setSpecies(selectedSpecies);
      setDifficulty(selectedDifficulty);
      setPhase('playing');
    },
    []
  );

  const handleVictory = useCallback((time) => {
    setFinalTime(time);
    setPhase('victory');
  }, []);

  const handleBackToSelect = useCallback(() => {
    setPhase('select');
  }, []);

  const handleBackToTitle = useCallback(() => {
    setPhase('title');
    setSpecies(null);
  }, []);

  const handlePlayAgain = useCallback(() => {
    // Re-start same leaf and difficulty (new seed)
    setPhase('playing');
  }, []);

  const handleNewLeaf = useCallback(() => {
    setPhase('select');
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {phase === 'title' && <TitleScreen onPlay={handlePlay} />}

      {phase === 'select' && (
        <LeafSelect
          onStart={handleStartPuzzle}
          onBack={handleBackToTitle}
          autumn={autumn}
          onToggleAutumn={() => setAutumn((a) => !a)}
        />
      )}

      {(phase === 'playing' || phase === 'victory') && species && (
        <PuzzleCanvas
          species={species}
          difficulty={difficulty}
          autumn={autumn}
          onVictory={handleVictory}
          onBack={handleBackToSelect}
          isVictory={phase === 'victory'}
          finalTime={finalTime}
          onPlayAgain={handlePlayAgain}
          onNewLeaf={handleNewLeaf}
        />
      )}
    </div>
  );
}
