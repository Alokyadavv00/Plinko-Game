'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import PlinkoBoard from './PlinkoBoard';
import PayoutTable from './PayoutTable';
import FairnessInfo from './FairnessInfo';
import SessionLog from './SessionLog';
import { resumeAudio, setMuted, isMuted, playDrop } from '@/lib/audio';
import { PAYOUT_TABLE } from '@/lib/payouts';

type GameState = 'IDLE' | 'COMMITTING' | 'DROPPING' | 'REVEALING' | 'DONE';

interface RoundData {
  roundId: string;
  commitHex: string;
  nonce: string;
  serverSeed?: string;
  clientSeed?: string;
  binIndex?: number;
  path?: boolean[];
  payoutMultiplier?: number;
  pegMapHash?: string;
  combinedSeed?: string;
}

export default function Game() {
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [dropColumn, setDropColumn] = useState(6);
  const [betCents, setBetCents] = useState(100);
  const [clientSeed, setClientSeed] = useState('');
  const [muted, setMutedState] = useState(false);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [recentRounds, setRecentRounds] = useState<RoundData[]>([]);
  const [tiltMode, setTiltMode] = useState(false);
  const [dungeonTheme, setDungeonTheme] = useState(false);
  const [goldenBall, setGoldenBall] = useState(false);
  const recentBinsRef = useRef<number[]>([]);
  const secretBuffer = useRef('');

  // Load recent rounds on mount
  useEffect(() => {
    fetch('/api/rounds?limit=20')
      .then(r => r.json())
      .then(data => {
        if (data.rounds) setRecentRounds(data.rounds);
      })
      .catch(() => { });
  }, []);

  // Easter egg listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // TILT mode toggle
      if (e.key === 't' || e.key === 'T') {
        if (document.activeElement?.tagName === 'INPUT') return;
        setTiltMode(prev => !prev);
      }

      // Debug grid (G key) - handled in PlinkoBoard
      // Column selection with arrow keys
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setDropColumn(prev => Math.max(0, prev - 1));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setDropColumn(prev => Math.min(12, prev + 1));
      }
      if (e.key === ' ' && gameState === 'IDLE') {
        e.preventDefault();
        handleDrop();
      }

      // "open sesame" easter egg
      if (document.activeElement?.tagName !== 'INPUT') {
        secretBuffer.current += e.key.toLowerCase();
        if (secretBuffer.current.length > 20) {
          secretBuffer.current = secretBuffer.current.slice(-20);
        }
        if (secretBuffer.current.includes('opensesame')) {
          setDungeonTheme(true);
          secretBuffer.current = '';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Apply dungeon theme
  useEffect(() => {
    if (dungeonTheme) {
      document.documentElement.classList.add('theme-dungeon');
    } else {
      document.documentElement.classList.remove('theme-dungeon');
    }
  }, [dungeonTheme]);

  // Check golden ball condition
  const checkGoldenBall = useCallback((binIndex: number) => {
    recentBinsRef.current.push(binIndex);
    if (recentBinsRef.current.length > 3) {
      recentBinsRef.current = recentBinsRef.current.slice(-3);
    }
    // Golden ball if last 3 landings were center bin (6)
    if (
      recentBinsRef.current.length === 3 &&
      recentBinsRef.current.every(b => b === 6)
    ) {
      setGoldenBall(true);
    }
  }, []);

  const handleDrop = useCallback(async () => {
    if (gameState !== 'IDLE') return;
    resumeAudio();

    const seed = clientSeed || `client-${Date.now()}`;

    try {
      // Step 1: Commit
      setGameState('COMMITTING');
      const commitRes = await fetch('/api/rounds/commit', { method: 'POST' });
      const commitData = await commitRes.json();

      setRoundData({
        roundId: commitData.roundId,
        commitHex: commitData.commitHex,
        nonce: commitData.nonce,
        clientSeed: seed,
      });

      // Step 2: Start
      const startRes = await fetch(`/api/rounds/${commitData.roundId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSeed: seed,
          betCents,
          dropColumn,
        }),
      });
      const startData = await startRes.json();

      setRoundData(prev => ({
        ...prev!,
        binIndex: startData.binIndex,
        path: startData.path,
        payoutMultiplier: startData.payoutMultiplier,
        pegMapHash: startData.pegMapHash,
      }));

      // Step 3: Start animation
      setGameState('DROPPING');
      setAnimationComplete(false);
      playDrop();
    } catch (error) {
      console.error('Error during drop:', error);
      setGameState('IDLE');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, clientSeed, betCents, dropColumn]);

  const handleAnimationComplete = useCallback(async () => {
    setAnimationComplete(true);
    if (!roundData?.roundId) return;

    try {
      // Step 4: Reveal
      setGameState('REVEALING');
      const revealRes = await fetch(`/api/rounds/${roundData.roundId}/reveal`, {
        method: 'POST',
      });
      const revealData = await revealRes.json();

      setRoundData(prev => ({
        ...prev!,
        serverSeed: revealData.serverSeed,
      }));

      // Check easter eggs
      if (roundData.binIndex !== undefined) {
        checkGoldenBall(roundData.binIndex);
      }

      // If dungeon theme was active, remove it after this round
      if (dungeonTheme) {
        setTimeout(() => setDungeonTheme(false), 2000);
      }

      // If golden ball was used, disable it
      if (goldenBall) {
        setGoldenBall(false);
      }

      setGameState('DONE');

      // Refresh session log
      const logRes = await fetch('/api/rounds?limit=20');
      const logData = await logRes.json();
      if (logData.rounds) setRecentRounds(logData.rounds);
    } catch (error) {
      console.error('Error revealing:', error);
      setGameState('DONE');
    }
  }, [roundData, checkGoldenBall, dungeonTheme, goldenBall]);

  const handleNewRound = useCallback(() => {
    setGameState('IDLE');
    setRoundData(null);
    setAnimationComplete(false);
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted();
    setMuted(newMuted);
    setMutedState(newMuted);
  }, []);

  return (
    <div className={`game-layout ${tiltMode ? 'tilt-mode' : ''}`}>
      <div className="board-container">
        {/* Status */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`status-badge ${gameState.toLowerCase()}`}>
            {gameState === 'IDLE' ? '● Ready' :
              gameState === 'COMMITTING' ? '◌ Committing...' :
                gameState === 'DROPPING' ? '● Dropping...' :
                  gameState === 'REVEALING' ? '◌ Revealing...' :
                    '✓ Complete'}
          </span>
          {roundData?.payoutMultiplier !== undefined && gameState === 'DONE' && (
            <span className="status-badge revealed fade-in">
              Bin {roundData.binIndex} • {roundData.payoutMultiplier}x
            </span>
          )}
        </div>

        {/* Canvas Board */}
        <PlinkoBoard
          path={roundData?.path || null}
          binIndex={roundData?.binIndex ?? null}
          isDropping={gameState === 'DROPPING'}
          dropColumn={dropColumn}
          onAnimationComplete={handleAnimationComplete}
          goldenBall={goldenBall}
          tiltMode={tiltMode}
        />

        {/* Payout Strip */}
        <PayoutTable activeBin={gameState === 'DONE' ? (roundData?.binIndex ?? null) : null} />

        {/* Controls */}
        <div className="controls-panel glass-card">
          <div className="control-group">
            <label className="control-label" htmlFor="drop-column">Drop Column</label>
            <div className="column-selector">
              {Array.from({ length: 13 }, (_, i) => (
                <button
                  key={i}
                  id={`col-btn-${i}`}
                  className={`col-btn ${dropColumn === i ? 'active' : ''}`}
                  onClick={() => setDropColumn(i)}
                  disabled={gameState !== 'IDLE'}
                  aria-label={`Column ${i}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="bet-input">Bet (¢)</label>
            <input
              id="bet-input"
              type="number"
              className="control-input control-input-sm"
              value={betCents}
              onChange={e => setBetCents(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              disabled={gameState !== 'IDLE'}
            />
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="seed-input">Client Seed</label>
            <input
              id="seed-input"
              type="text"
              className="control-input"
              value={clientSeed}
              onChange={e => setClientSeed(e.target.value)}
              placeholder="optional seed..."
              disabled={gameState !== 'IDLE'}
              style={{ width: '150px' }}
            />
          </div>

          {gameState === 'IDLE' ? (
            <button
              id="drop-button"
              className="btn-drop"
              onClick={handleDrop}
              aria-label="Drop ball"
            >
              🎱 Drop
            </button>
          ) : gameState === 'DONE' ? (
            <button
              id="new-round-button"
              className="btn-drop"
              onClick={handleNewRound}
              aria-label="New round"
            >
              ↻ Again
            </button>
          ) : (
            <button className="btn-drop" disabled>
              {gameState === 'DROPPING' ? '⏳ Dropping...' : '⏳ Wait...'}
            </button>
          )}

          <button
            id="mute-toggle"
            className={`btn-icon ${muted ? 'active' : ''}`}
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* Fairness Info */}
        {roundData && (
          <FairnessInfo
            roundData={roundData}
            gameState={gameState}
          />
        )}
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <SessionLog rounds={recentRounds} />
      </div>
    </div>
  );
}
